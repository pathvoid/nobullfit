// Admin database connection pool - connects to production database
// Uses ADMIN_DB_* environment variables for separate credentials
// Only used by admin panel handlers (dev-only)

type Pool = import("pg").Pool;

let adminPool: Pool | null = null;
let adminPoolInitialized = false;

// Lazy initialization - only runs on server side
async function initializeAdminPool(): Promise<Pool | null> {
    if (adminPool !== null) {
        return adminPool;
    }

    if (typeof window !== "undefined" || typeof process === "undefined") {
        return null;
    }

    // Only allow in development
    if (process.env.NODE_ENV === "production") {
        return null;
    }

    if (adminPoolInitialized) {
        return adminPool;
    }

    adminPoolInitialized = true;

    try {
        const pgModule = await import("pg");
        const dotenvModule = await import("dotenv");
        dotenvModule.default.config();

        const { Pool } = pgModule.default;

        // Mirror the main pool's SSL handling: honor ADMIN_DB_SSL_CA when provided.
        let sslConfig: false | { rejectUnauthorized: boolean; ca?: string } = false;
        if (process.env.ADMIN_DB_SSL === "true") {
            if (process.env.ADMIN_DB_SSL_CA) {
                sslConfig = { rejectUnauthorized: true, ca: process.env.ADMIN_DB_SSL_CA };
            } else {
                console.warn("[Admin DB] ADMIN_DB_SSL=true without ADMIN_DB_SSL_CA — rejectUnauthorized=false.");
                sslConfig = { rejectUnauthorized: false };
            }
        }

        adminPool = new Pool({
            host: process.env.ADMIN_DB_HOST || "localhost",
            port: parseInt(process.env.ADMIN_DB_PORT || "5432", 10),
            database: process.env.ADMIN_DB_NAME || "nobullfit",
            user: process.env.ADMIN_DB_USER || "postgres",
            password: process.env.ADMIN_DB_PASSWORD || "",
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: sslConfig
        });

        if (adminPool) {
            adminPool.on("error", (err: Error) => {
                console.error("[Admin DB] Unexpected error on idle client", err);
            });
        }
    } catch (error) {
        console.error("[Admin DB] Failed to initialize connection:", error);
        adminPool = null;
    }

    return adminPool;
}

export default async function getAdminPool(): Promise<Pool | null> {
    return await initializeAdminPool();
}
