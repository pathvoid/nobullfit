// Feature flag service - provides cached access to feature flags
// Caches flags in memory with a TTL to reduce database queries

import getPool from "../../db/connection.js";

export interface FeatureFlag {
    id: number;
    flag_key: string;
    flag_name: string;
    description: string | null;
    is_enabled: boolean;
    created_at: Date;
    updated_at: Date;
}

// Cache configuration
const CACHE_TTL_MS = 5000; // 5 second cache TTL (short for faster updates)
let flagCache: Map<string, FeatureFlag> = new Map();
let cacheLastUpdated: number = 0;

// Check if cache is stale
function isCacheStale(): boolean {
    return Date.now() - cacheLastUpdated > CACHE_TTL_MS;
}

// Refresh the flag cache from database
export async function refreshFlagCache(): Promise<void> {
    const pool = await getPool();
    if (!pool) {
        console.error("Feature flag service: Database pool not available");
        return;
    }

    try {
        const result = await pool.query<FeatureFlag>(
            "SELECT id, flag_key, flag_name, description, is_enabled, created_at, updated_at FROM feature_flags"
        );

        // Clear and rebuild cache
        flagCache.clear();
        for (const row of result.rows) {
            flagCache.set(row.flag_key, row);
        }
        cacheLastUpdated = Date.now();
    } catch (error) {
        console.error("Feature flag service: Failed to refresh cache", error);
    }
}

// Ensure cache is fresh before accessing
async function ensureCacheFresh(): Promise<void> {
    if (isCacheStale() || flagCache.size === 0) {
        await refreshFlagCache();
    }
}

// Check if a feature flag is enabled
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
    await ensureCacheFresh();
    const flag = flagCache.get(flagKey);
    return flag?.is_enabled ?? false;
}

// Get a specific feature flag by key
export async function getFeatureFlag(flagKey: string): Promise<FeatureFlag | null> {
    await ensureCacheFresh();
    return flagCache.get(flagKey) ?? null;
}

// Get all feature flags
export async function getAllFlags(): Promise<FeatureFlag[]> {
    await ensureCacheFresh();
    return Array.from(flagCache.values());
}

// Get all enabled feature flags
export async function getEnabledFlags(): Promise<FeatureFlag[]> {
    await ensureCacheFresh();
    return Array.from(flagCache.values()).filter(flag => flag.is_enabled);
}

// Get all integration-related feature flags
export async function getIntegrationFlags(): Promise<FeatureFlag[]> {
    await ensureCacheFresh();
    return Array.from(flagCache.values()).filter(flag =>
        flag.flag_key.startsWith("integration_")
    );
}

// Get enabled integration flags as a list of provider keys
export async function getEnabledIntegrationProviders(): Promise<string[]> {
    const integrationFlags = await getIntegrationFlags();
    return integrationFlags
        .filter(flag => flag.is_enabled)
        .map(flag => flag.flag_key.replace("integration_", ""));
}

// Check if a specific integration is enabled
export async function isIntegrationEnabled(provider: string): Promise<boolean> {
    const flagKey = `integration_${provider}`;
    return isFeatureEnabled(flagKey);
}

// Update a feature flag (admin use only)
export async function updateFeatureFlag(flagKey: string, isEnabled: boolean): Promise<boolean> {
    const pool = await getPool();
    if (!pool) {
        console.error("Feature flag service: Database pool not available");
        return false;
    }

    try {
        const result = await pool.query(
            "UPDATE feature_flags SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE flag_key = $2 RETURNING *",
            [isEnabled, flagKey]
        );

        if (result.rowCount === 0) {
            return false;
        }

        // Invalidate cache to force refresh on next access
        cacheLastUpdated = 0;
        return true;
    } catch (error) {
        console.error("Feature flag service: Failed to update flag", error);
        return false;
    }
}

// Initialize default integration flags if they don't exist
export async function initializeDefaultIntegrationFlags(): Promise<void> {
    const pool = await getPool();
    if (!pool) {
        console.error("Feature flag service: Database pool not available");
        return;
    }

    // Currently only Strava is supported
    const defaultFlags = [
        { key: "integration_strava", name: "Strava Integration", description: "Enable Strava workout imports" }
    ];

    try {
        for (const flag of defaultFlags) {
            await pool.query(
                `INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled)
                 VALUES ($1, $2, $3, true)
                 ON CONFLICT (flag_key) DO NOTHING`,
                [flag.key, flag.name, flag.description]
            );
        }
        // Refresh cache after initialization
        await refreshFlagCache();
    } catch (error) {
        console.error("Feature flag service: Failed to initialize default flags", error);
    }
}

// Force cache invalidation (useful for testing or admin operations)
export function invalidateCache(): void {
    cacheLastUpdated = 0;
}
