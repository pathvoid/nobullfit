// Database connection pool - uses environment variables for security
// Never hardcode credentials in source code
// Only initialize on server side (not in browser)

// Use type-only import to avoid bundling pg on client side
type Pool = import("pg").Pool;

let pool: Pool | null = null;
let poolInitialized = false;

// Lazy initialization function - only runs on server side
async function initializePool(): Promise<Pool | null> {
    // Already initialized
    if (pool !== null) {
        return pool;
    }

    // Don't initialize on client side
    if (typeof window !== "undefined") {
        return null;
    }

    // Don't initialize if process is not available
    if (typeof process === "undefined") {
        return null;
    }

    // Prevent multiple initialization attempts
    if (poolInitialized) {
        return pool;
    }

    poolInitialized = true;

    try {
        // Use ES module dynamic imports - this will only execute on server
        const pgModule = await import("pg");
        
        // dotenv is already loaded in server.ts, but ensure it's loaded here too
        const dotenvModule = await import("dotenv");
        dotenvModule.default.config();

        const { Pool } = pgModule.default;

        // Fail fast in production when DB credentials are missing instead of silently
        // attempting a connection with well-known defaults (postgres / empty password).
        if (process.env.NODE_ENV === "production") {
            if (!process.env.DB_USER) {
                throw new Error("FATAL: DB_USER environment variable is not set.");
            }
            if (!process.env.DB_PASSWORD) {
                throw new Error("FATAL: DB_PASSWORD environment variable is not set.");
            }
        }

        // Build SSL config: when DB_SSL_CA is provided, validate the server cert against it.
        // Otherwise fall back to the existing opportunistic TLS behavior.
        let sslConfig: false | { rejectUnauthorized: boolean; ca?: string } = false;
        if (process.env.DB_SSL === "true") {
            if (process.env.DB_SSL_CA) {
                sslConfig = { rejectUnauthorized: true, ca: process.env.DB_SSL_CA };
            } else {
                console.warn("[DB] DB_SSL=true without DB_SSL_CA — connecting with rejectUnauthorized=false. Set DB_SSL_CA to validate the server certificate.");
                sslConfig = { rejectUnauthorized: false };
            }
        }

        pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: parseInt(process.env.DB_PORT || "5432", 10),
            database: process.env.DB_NAME || "nobullfit",
            user: process.env.DB_USER || "postgres",
            password: process.env.DB_PASSWORD || "",
            // Connection pool settings for better performance and security
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 5000, // Increased to 5 seconds for debugging
            ssl: sslConfig
        });

        // Handle pool errors by logging only. A transient idle-client error
        // (network blip, server restart, etc.) should not take down the whole
        // process — the pool itself recovers by establishing new clients on demand.
        if (pool) {
            pool.on("error", (err: Error) => {
                console.error("Unexpected error on idle client", err);
            });
        }
    } catch (error) {
        // Log the full error for debugging
        console.error("Failed to initialize database connection:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        pool = null;
    }

    return pool;
}

// Test database connection
export const testConnection = async (): Promise<boolean> => {
    const dbPool = await initializePool();
    if (!dbPool) {
        console.error("Database pool not initialized - server-side only");
        return false;
    }
    try {
        const client = await dbPool.connect();
        await client.query("SELECT NOW()");
        client.release();
        return true;
    } catch (error) {
        console.error("Database connection error:", error);
        return false;
    }
};

// Export getter function that initializes on first access
export default async function getPool(): Promise<Pool | null> {
    return await initializePool();
}
