// OpenFoodFacts service using DuckDB for querying local food database
// Uses indexed database if available (run npm run setup:off-database), falls back to Parquet
import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import path from "path";
import fs from "fs";

// Singleton DuckDB instance
let dbInstance: DuckDBInstance | null = null;
let dbConnection: DuckDBConnection | null = null;
let useIndexedDb = false;

// Paths to data files
const DATA_DIR = path.join(process.cwd(), "data", "openfoodfacts");
const INDEXED_DB_PATH = path.join(DATA_DIR, "food.duckdb");
const PARQUET_PATH = process.env.OFF_DATA_PATH || path.join(DATA_DIR, "food.parquet");

// Initialize DuckDB connection
// Uses indexed database if available for faster queries
async function getConnection(): Promise<DuckDBConnection> {
    if (dbConnection) {
        return dbConnection;
    }
    
    // Check if indexed database exists
    if (fs.existsSync(INDEXED_DB_PATH)) {
        dbInstance = await DuckDBInstance.create(INDEXED_DB_PATH);
        dbConnection = await dbInstance.connect();
        useIndexedDb = true;
        console.log("Using indexed OpenFoodFacts database for fast queries");
    } else {
        // Fall back to in-memory with direct Parquet access
        dbInstance = await DuckDBInstance.create(":memory:");
        dbConnection = await dbInstance.connect();
        useIndexedDb = false;
        console.log("Using direct Parquet access (run 'npm run setup:off-database' for faster queries)");
    }
    
    return dbConnection;
}

// OpenFoodFacts food item interface (compatible with previous API structure)
export interface OFFFood {
    foodId: string;
    label: string;
    knownAs?: string;
    nutrients: {
        ENERC_KCAL?: number;
        PROCNT?: number;
        FAT?: number;
        CHOCDF?: number;
        FIBTG?: number;
        SUGAR?: number;
        NA?: number;
        CA?: number;
        FE?: number;
        K?: number;
        MG?: number;
        P?: number;
        ZN?: number;
        VITC?: number;
        THIA?: number;
        RIBF?: number;
        NIA?: number;
        VITB6A?: number;
        FOLDFE?: number;
        VITB12?: number;
        VITD?: number;
        VITK1?: number;
        TOCPHA?: number;
        VITA_RAE?: number;
        CHOLE?: number;
        FASAT?: number;
        FAMS?: number;
        FAPU?: number;
        WATER?: number;
    };
    brand?: string;
    category?: string;
    categoryLabel?: string;
    foodContentsLabel?: string;
    image?: string;
    measures?: OFFMeasure[];
}

export interface OFFMeasure {
    uri: string;
    label: string;
    weight: number;
}

export interface OFFSearchResult {
    text: string;
    count: number;
    parsed: Array<{
        food: OFFFood;
    }>;
    hints: Array<{
        food: OFFFood;
        measures: OFFMeasure[];
    }>;
    _links?: {
        next?: {
            href: string;
            title: string;
        };
    };
}

// Nutriment entry from Parquet nutriments array
interface OFFNutriment {
    name: string;
    value?: number;
    "100g"?: number;
    serving?: number;
    unit?: string;
}

// Raw product data from Parquet (matching actual schema)
interface OFFRawProduct {
    code: string;
    product_name: string;
    brands?: string;
    categories?: string;
    ingredients_text?: string;
    serving_size?: string;
    serving_quantity?: string;
    nutriments?: OFFNutriment[];
    images?: unknown;
}

// Build barcode path for OpenFoodFacts image URLs
// OFF uses: first 3 digits / next 3 / next 3 / remaining digits
// Example: 3017620422003 -> 301/762/042/2003
function buildBarcodePath(barcode: string): string {
    if (!barcode) return "";
    
    if (barcode.length > 8) {
        // Standard EAN-13 or longer: split as 3/3/3/rest
        const p1 = barcode.slice(0, 3);
        const p2 = barcode.slice(3, 6);
        const p3 = barcode.slice(6, 9);
        const rest = barcode.slice(9);
        return `${p1}/${p2}/${p3}/${rest}`;
    } else {
        // Short barcodes: use as-is
        return barcode;
    }
}

// Build image URL using images data from Parquet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildImageUrl(barcode: string, images?: any): string {
    if (!barcode) return "";
    
    const imgPath = buildBarcodePath(barcode);
    
    // Try to find a front image from the images array
    if (images) {
        // DuckDB returns struct arrays as {items: [{entries: {...}}, ...]}
        const items = images.items || (Array.isArray(images) ? images : []);
        
        // Look for front image in order of preference
        const frontKeys = ["front_en", "front", "front_fr", "front_de", "front_es", "front_it"];
        
        for (const preferredKey of frontKeys) {
            for (const item of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entry = (item as any).entries || item;
                const key = entry.key as string | undefined;
                const rev = entry.rev as number | undefined;
                
                if (key === preferredKey && rev) {
                    // Build URL with revision number: front_en.5.400.jpg
                    return `https://images.openfoodfacts.org/images/products/${imgPath}/${key}.${rev}.400.jpg`;
                }
            }
        }
        
        // If no front image found with rev, try without rev
        for (const preferredKey of frontKeys) {
            for (const item of items) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entry = (item as any).entries || item;
                const key = entry.key as string | undefined;
                
                if (key === preferredKey) {
                    return `https://images.openfoodfacts.org/images/products/${imgPath}/${key}.400.jpg`;
                }
            }
        }
    }
    
    // Fallback: try common patterns
    return `https://images.openfoodfacts.org/images/products/${imgPath}/front.400.jpg`;
}

// Map OFF nutriment names to our nutrient codes
const NUTRIMENT_MAP: Record<string, keyof OFFFood["nutrients"]> = {
    "energy-kcal": "ENERC_KCAL",
    "proteins": "PROCNT",
    "fat": "FAT",
    "carbohydrates": "CHOCDF",
    "fiber": "FIBTG",
    "sugars": "SUGAR",
    "sodium": "NA",
    "calcium": "CA",
    "iron": "FE",
    "potassium": "K",
    "magnesium": "MG",
    "phosphorus": "P",
    "zinc": "ZN",
    "vitamin-c": "VITC",
    "vitamin-b1": "THIA",
    "vitamin-b2": "RIBF",
    "vitamin-pp": "NIA",
    "vitamin-b6": "VITB6A",
    "folates": "FOLDFE",
    "vitamin-b12": "VITB12",
    "vitamin-d": "VITD",
    "vitamin-k": "VITK1",
    "vitamin-e": "TOCPHA",
    "vitamin-a": "VITA_RAE",
    "cholesterol": "CHOLE",
    "saturated-fat": "FASAT",
    "monounsaturated-fat": "FAMS",
    "polyunsaturated-fat": "FAPU",
    "water": "WATER"
};

// Convert raw product to our food format
function convertToOFFFood(product: OFFRawProduct): OFFFood {
    const nutrients: OFFFood["nutrients"] = {};
    
    // Extract nutrients from the nutriments - DuckDB returns struct arrays as {items: [{entries: {...}}, ...]}
    if (product.nutriments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nutrimentsObj = product.nutriments as any;
        const items = nutrimentsObj.items || (Array.isArray(product.nutriments) ? product.nutriments : []);
        
        for (const item of items) {
            // Each item has an "entries" property containing the actual data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entry = (item as any).entries || item;
            const name = entry.name as string | undefined;
            const value100g = entry["100g"] as number | undefined;
            
            if (name) {
                const ourKey = NUTRIMENT_MAP[name];
                if (ourKey && value100g != null) {
                    let value = value100g;
                    // Convert g to mg for minerals and some vitamins
                    if (["NA", "CA", "FE", "K", "MG", "P", "ZN", "VITC", "THIA", "RIBF", "NIA", "VITB6A", "TOCPHA", "CHOLE"].includes(ourKey)) {
                        value = value * 1000;
                    }
                    // Convert g to mcg for B12, D, K, A, folates
                    if (["FOLDFE", "VITB12", "VITD", "VITK1", "VITA_RAE"].includes(ourKey)) {
                        value = value * 1000000;
                    }
                    nutrients[ourKey] = value;
                }
            }
        }
    }
    
    const measures: OFFMeasure[] = [
        { uri: "off://gram", label: "Gram", weight: 1 },
        { uri: "off://100g", label: "100g", weight: 100 }
    ];
    
    // Parse serving_size to extract a meaningful label and weight
    // Examples: "1 banana (118g)", "100 g", "1 serving (30g)", "250ml"
    const servingSize = product.serving_size || "";
    let servingQty = product.serving_quantity ? parseFloat(product.serving_quantity) : 0;
    let servingLabel = "Serving";
    
    if (servingSize) {
        // Try to extract weight from serving_size if not in serving_quantity
        // Match patterns like "(118g)", "(30 g)", "(250ml)"
        const weightMatch = servingSize.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\)/i);
        if (weightMatch && !servingQty) {
            servingQty = parseFloat(weightMatch[1]);
        }
        
        // Extract the label part (before the parentheses with weight)
        const labelMatch = servingSize.match(/^(.+?)(?:\s*\(\d)/);
        if (labelMatch) {
            servingLabel = labelMatch[1].trim();
        } else if (!servingSize.match(/^\d+\s*(?:g|ml)$/i)) {
            // Use the whole string if it's not just "100g" or similar
            servingLabel = servingSize;
        }
    }
    
    if (servingQty > 0) {
        measures.unshift({
            uri: "off://serving",
            label: servingLabel,
            weight: servingQty
        });
    }
    
    // Add common measures based on product category or name for better UX
    const productName = (product.product_name || "").toLowerCase();
    const categoryLower = (product.categories || "").toLowerCase();
    
    // Common fruit/vegetable measures
    if (categoryLower.includes("banana") || productName.includes("banana")) {
        if (!measures.some(m => m.label.toLowerCase().includes("banana"))) {
            measures.unshift(
                { uri: "off://small", label: "Small banana", weight: 100 },
                { uri: "off://medium", label: "Medium banana", weight: 118 },
                { uri: "off://large", label: "Large banana", weight: 136 }
            );
        }
    } else if (categoryLower.includes("apple") || productName.includes("apple")) {
        if (!measures.some(m => m.label.toLowerCase().includes("apple"))) {
            measures.unshift(
                { uri: "off://small", label: "Small apple", weight: 150 },
                { uri: "off://medium", label: "Medium apple", weight: 180 },
                { uri: "off://large", label: "Large apple", weight: 220 }
            );
        }
    } else if (categoryLower.includes("orange") || productName.includes("orange")) {
        if (!measures.some(m => m.label.toLowerCase().includes("orange"))) {
            measures.unshift(
                { uri: "off://small", label: "Small orange", weight: 100 },
                { uri: "off://medium", label: "Medium orange", weight: 130 },
                { uri: "off://large", label: "Large orange", weight: 185 }
            );
        }
    } else if (categoryLower.includes("egg") || productName.includes("egg")) {
        if (!measures.some(m => m.label.toLowerCase().includes("egg"))) {
            measures.unshift(
                { uri: "off://small", label: "Small egg", weight: 38 },
                { uri: "off://medium", label: "Medium egg", weight: 44 },
                { uri: "off://large", label: "Large egg", weight: 50 },
                { uri: "off://xlarge", label: "Extra large egg", weight: 56 }
            );
        }
    } else if (categoryLower.includes("bread") || productName.includes("bread")) {
        if (!measures.some(m => m.label.toLowerCase().includes("slice"))) {
            measures.unshift(
                { uri: "off://slice", label: "Slice", weight: 30 }
            );
        }
    }
    
    const categories = product.categories || "";
    const firstCategory = categories.split(",")[0]?.trim() || "";
    
    // Build image URL using the images data from Parquet
    const imageUrl = product.code ? buildImageUrl(product.code, product.images) : "";
    
    return {
        foodId: product.code,
        label: product.product_name || "Unknown Product",
        brand: product.brands?.split(",")[0]?.trim(),
        category: firstCategory,
        categoryLabel: firstCategory,
        foodContentsLabel: product.ingredients_text,
        image: imageUrl,
        nutrients,
        measures
    };
}

// Search foods from database
// Supports multi-term search: each term must match either product_name or brands
export async function searchFoods(query: string, limit: number = 20, offset: number = 0): Promise<OFFSearchResult> {
    const conn = await getConnection();
    
    // Split query into terms and escape each
    const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
    
    if (terms.length === 0) {
        return {
            text: query,
            count: 0,
            parsed: [],
            hints: []
        };
    }
    
    // Build WHERE clause: each term must match either product_name or brands
    const escapedTerms = terms.map(t => t.replace(/[%_\\]/g, "\\$&"));
    const termPatterns = escapedTerms.map(t => `%${t}%`);
    
    // For relevance ordering, use the first term for prefix matching
    const firstTermStartsWith = `${escapedTerms[0]}%`;
    
    let result;
    
    if (useIndexedDb) {
        // Build dynamic WHERE conditions for each term
        const whereConditions = termPatterns.map((_, i) => 
            `(product_name ILIKE $${i + 1} OR brands ILIKE $${i + 1})`
        ).join(" AND ");
        
        const params = [
            ...termPatterns,
            limit,
            offset,
            firstTermStartsWith
        ];
        
        // Query from indexed products table (faster)
        result = await conn.run(`
            SELECT 
                code,
                product_name,
                brands,
                categories,
                ingredients_text,
                serving_size,
                serving_quantity,
                nutriments,
                images
            FROM products
            WHERE ${whereConditions}
            ORDER BY 
                CASE WHEN product_name ILIKE $${termPatterns.length + 3} THEN 0 ELSE 1 END,
                length(product_name),
                CASE WHEN array_length(nutriments) > 0 THEN 0 ELSE 1 END
            LIMIT $${termPatterns.length + 1} OFFSET $${termPatterns.length + 2}
        `, params);
    } else {
        // Build dynamic WHERE conditions for each term (Parquet version)
        const whereConditions = termPatterns.map((_, i) => 
            `(product_name[1].text ILIKE $${i + 1} OR brands ILIKE $${i + 1})`
        ).join(" AND ");
        
        const params = [
            ...termPatterns,
            limit,
            offset,
            firstTermStartsWith
        ];
        
        // Query directly from Parquet (slower, no setup required)
        result = await conn.run(`
            SELECT 
                code,
                product_name[1].text as product_name,
                brands,
                categories,
                ingredients_text[1].text as ingredients_text,
                serving_size,
                serving_quantity,
                nutriments,
                images
            FROM read_parquet('${PARQUET_PATH.replace(/\\/g, "/")}')
            WHERE ${whereConditions}
                AND product_name[1].text IS NOT NULL
            ORDER BY 
                CASE WHEN product_name[1].text ILIKE $${termPatterns.length + 3} THEN 0 ELSE 1 END,
                length(product_name[1].text),
                CASE WHEN array_length(nutriments) > 0 THEN 0 ELSE 1 END
            LIMIT $${termPatterns.length + 1} OFFSET $${termPatterns.length + 2}
        `, params);
    }
    
    const rows = await result.getRows();
    const columns = result.columnNames();
    
    const products: OFFRawProduct[] = rows.map(row => {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj as unknown as OFFRawProduct;
    });
    
    const foods = products.map(convertToOFFFood);
    
    // Estimate count based on results (avoid full scan for count)
    const count = foods.length < limit ? offset + foods.length : -1;
    
    const response: OFFSearchResult = {
        text: query,
        count,
        parsed: [],
        hints: foods.map(food => ({
            food,
            measures: food.measures || []
        }))
    };
    
    if (foods.length === limit) {
        const nextOffset = offset + limit;
        response._links = {
            next: {
                href: `/api/food-database/search?query=${encodeURIComponent(query)}&offset=${nextOffset}&limit=${limit}`,
                title: "Next page"
            }
        };
    }
    
    return response;
}

// Get food details by barcode/foodId
export async function getFoodById(foodId: string): Promise<OFFFood | null> {
    const conn = await getConnection();
    
    let result;
    
    if (useIndexedDb) {
        // Query from indexed products table (faster)
        result = await conn.run(`
            SELECT 
                code,
                product_name,
                brands,
                categories,
                ingredients_text,
                serving_size,
                serving_quantity,
                nutriments,
                images
            FROM products
            WHERE code = $1
            LIMIT 1
        `, [foodId]);
    } else {
        // Query directly from Parquet
        result = await conn.run(`
            SELECT 
                code,
                product_name[1].text as product_name,
                brands,
                categories,
                ingredients_text[1].text as ingredients_text,
                serving_size,
                serving_quantity,
                nutriments,
                images
            FROM read_parquet('${PARQUET_PATH.replace(/\\/g, "/")}')
            WHERE code = $1
            LIMIT 1
        `, [foodId]);
    }
    
    const rows = await result.getRows();
    
    if (rows.length === 0) {
        return null;
    }
    
    const columns = result.columnNames();
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
        obj[col] = rows[0][i];
    });
    
    return convertToOFFFood(obj as unknown as OFFRawProduct);
}

// Calculate nutrients for a given quantity and measure
export function calculateNutrients(
    food: OFFFood,
    quantity: number,
    measureUri: string
): Record<string, number> {
    const measure = food.measures?.find(m => m.uri === measureUri);
    const measureWeight = measure?.weight || 100;
    const multiplier = (quantity * measureWeight) / 100;
    
    const nutrients: Record<string, number> = {};
    
    if (food.nutrients) {
        Object.entries(food.nutrients).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                nutrients[key] = value * multiplier;
            }
        });
    }
    
    return nutrients;
}

// Close DuckDB connection
export async function closeConnection(): Promise<void> {
    if (dbConnection) {
        dbConnection.closeSync();
        dbConnection = null;
    }
    if (dbInstance) {
        dbInstance = null;
    }
}
