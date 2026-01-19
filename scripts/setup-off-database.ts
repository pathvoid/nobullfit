// Script to build an indexed DuckDB database from the OpenFoodFacts Parquet file
// Run with: npm run setup:off-database
import { DuckDBInstance } from "@duckdb/node-api";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data", "openfoodfacts");
const PARQUET_PATH = path.join(DATA_DIR, "food.parquet");
const DB_PATH = path.join(DATA_DIR, "food.duckdb");

async function main() {
    console.log("OpenFoodFacts Database Setup");
    console.log("============================\n");

    // Check if Parquet file exists
    if (!fs.existsSync(PARQUET_PATH)) {
        console.error(`Error: Parquet file not found at ${PARQUET_PATH}`);
        console.error("Please download the OpenFoodFacts Parquet file first.");
        process.exit(1);
    }

    // Remove existing database if it exists (for clean rebuild)
    if (fs.existsSync(DB_PATH)) {
        console.log("Removing existing database...");
        fs.unlinkSync(DB_PATH);
        // Also remove WAL file if it exists
        const walPath = DB_PATH + ".wal";
        if (fs.existsSync(walPath)) {
            fs.unlinkSync(walPath);
        }
    }

    console.log("Creating new indexed database...");
    console.log(`Source: ${PARQUET_PATH}`);
    console.log(`Target: ${DB_PATH}\n`);

    const startTime = Date.now();

    // Create persistent database
    const db = await DuckDBInstance.create(DB_PATH);
    const conn = await db.connect();

    try {
        // Create the products table with flattened columns
        console.log("Step 1/3: Creating products table from Parquet...");
        console.log("This may take 1-2 minutes for large datasets...\n");

        await conn.run(`
            CREATE TABLE products AS
            SELECT 
                code,
                product_name[1].text as product_name,
                brands,
                categories,
                ingredients_text[1].text as ingredients_text,
                serving_size,
                serving_quantity,
                completeness,
                nutriments,
                images
            FROM read_parquet('${PARQUET_PATH.replace(/\\/g, "/")}')
            WHERE product_name[1].text IS NOT NULL
                AND completeness > 0.5
                AND serving_quantity IS NOT NULL
                AND serving_size IS NOT NULL
                AND array_length(nutriments) > 0
                AND len(list_filter(nutriments, x -> x.name = 'energy-kcal' AND x."100g" IS NOT NULL)) > 0
        `);

        // Get row count
        const countResult = await conn.run("SELECT COUNT(*) as cnt FROM products");
        const countRows = await countResult.getRows();
        const rowCount = countRows[0]?.[0] ?? 0;
        console.log(`Created table with ${Number(rowCount).toLocaleString()} products.\n`);

        // Create indexes for faster queries
        console.log("Step 2/3: Creating indexes...");
        
        // Index on code for lookups by barcode
        console.log("  - Creating index on code (barcode)...");
        await conn.run("CREATE INDEX idx_products_code ON products(code)");
        
        // Index on product_name for text search
        console.log("  - Creating index on product_name...");
        await conn.run("CREATE INDEX idx_products_name ON products(product_name)");
        
        console.log("Indexes created.\n");

        // Checkpoint to ensure all data is written to disk
        console.log("Step 3/3: Finalizing database...");
        await conn.run("CHECKPOINT");

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\nDatabase setup complete in ${elapsed} seconds.`);
        console.log(`Database saved to: ${DB_PATH}`);

    } catch (error) {
        console.error("\nError during setup:", error);
        process.exit(1);
    } finally {
        conn.closeSync();
    }
}

main().catch(console.error);
