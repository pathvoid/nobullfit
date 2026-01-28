// Integration sync API handler
// Manages sync operations and auto-sync settings

import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { decryptToken, encryptToken } from "../utils/encryptionService.js";
// TEMP: Using isIntegrationEnabledForUser instead of isIntegrationEnabled for Strava demo bypass
import { isIntegrationEnabledForUser } from "../utils/featureFlagService.js";
import { isValidProvider, getProviderConfig } from "../utils/integrationProviders/index.js";
import type { SyncResult, DataType } from "../utils/integrationProviders/types.js";
import { stravaFetch, canMakeReadRequest, getRetryAfterMs } from "../utils/stravaRateLimitService.js";

// Helper to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.cookies?.auth_token;

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
        return null;
    }

    return decoded.userId as number;
}

// Helper to check if user is a Pro subscriber
async function isProUser(userId: number): Promise<boolean> {
    const pool = await getPool();
    if (!pool) return false;

    const result = await pool.query(
        "SELECT subscribed FROM users WHERE id = $1",
        [userId]
    );

    return result.rows[0]?.subscribed === true;
}

// Trigger manual sync for an integration
export async function handleTriggerSync(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const provider = req.params.provider as string;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        // Check if integration is enabled
        // TEMP: Pass userId to allow user 2 to bypass Strava feature flag
        const isEnabled = await isIntegrationEnabledForUser(provider, userId);
        if (!isEnabled) {
            res.status(403).json({ error: "This integration is currently not available" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get connection
        const connectionResult = await pool.query(
            `SELECT id, access_token_encrypted, refresh_token_encrypted, token_expires_at, status
             FROM integration_connections
             WHERE user_id = $1 AND provider = $2`,
            [userId, provider]
        );

        if (connectionResult.rows.length === 0) {
            res.status(404).json({ error: "Integration not connected" });
            return;
        }

        const connection = connectionResult.rows[0];

        if (connection.status !== "active") {
            res.status(400).json({
                error: "Integration connection is not active",
                status: connection.status
            });
            return;
        }

        // Get data types to sync from request body or use provider defaults
        const config = getProviderConfig(provider);
        const dataTypes = (req.body?.dataTypes as DataType[]) || config?.supportedDataTypes || [];

        // Record sync start
        const startedAt = new Date();
        const historyResult = await pool.query(
            `INSERT INTO integration_sync_history
             (user_id, provider, sync_type, status, started_at)
             VALUES ($1, $2, 'manual', 'success', $3)
             RETURNING id`,
            [userId, provider, startedAt]
        );
        const historyId = historyResult.rows[0].id;

        try {
            // Check if token is expired and refresh if needed
            let accessToken = decryptToken(connection.access_token_encrypted);

            if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
                // Token expired, try to refresh
                if (!connection.refresh_token_encrypted) {
                    throw new Error("Access token expired and no refresh token available. Please reconnect.");
                }

                const refreshToken = decryptToken(connection.refresh_token_encrypted);
                const newTokens = await refreshStravaToken(refreshToken);

                if (!newTokens) {
                    throw new Error("Failed to refresh access token. Please reconnect your Strava account.");
                }

                // Update stored tokens
                await pool.query(
                    `UPDATE integration_connections
                     SET access_token_encrypted = $3,
                         refresh_token_encrypted = $4,
                         token_expires_at = $5,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = $1 AND provider = $2`,
                    [
                        userId,
                        provider,
                        encryptToken(newTokens.accessToken),
                        encryptToken(newTokens.refreshToken),
                        newTokens.expiresAt
                    ]
                );

                accessToken = newTokens.accessToken;
            }

            // Perform sync
            const syncResult = await performSync(provider, accessToken, dataTypes, userId);

            const completedAt = new Date();
            const durationMs = completedAt.getTime() - startedAt.getTime();

            // Update sync history
            await pool.query(
                `UPDATE integration_sync_history
                 SET status = $1, records_imported = $2, data_types_synced = $3,
                     error_message = $4, error_code = $5, completed_at = $6, duration_ms = $7
                 WHERE id = $8`,
                [
                    syncResult.success ? "success" : "failed",
                    syncResult.recordsImported,
                    JSON.stringify(syncResult.dataTypesSynced),
                    syncResult.error,
                    syncResult.errorCode,
                    completedAt,
                    durationMs,
                    historyId
                ]
            );

            // Update connection last sync time
            if (syncResult.success) {
                await pool.query(
                    `UPDATE integration_connections
                     SET last_sync_at = CURRENT_TIMESTAMP,
                         last_successful_sync_at = CURRENT_TIMESTAMP,
                         last_error = NULL,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = $1 AND provider = $2`,
                    [userId, provider]
                );
            } else {
                await pool.query(
                    `UPDATE integration_connections
                     SET last_sync_at = CURRENT_TIMESTAMP,
                         last_error = $3,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = $1 AND provider = $2`,
                    [userId, provider, syncResult.error]
                );
            }

            res.status(200).json({
                success: syncResult.success,
                recordsImported: syncResult.recordsImported,
                dataTypesSynced: syncResult.dataTypesSynced,
                durationMs,
                error: syncResult.error
            });
        } catch (syncError) {
            // Update history with error
            await pool.query(
                `UPDATE integration_sync_history
                 SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [syncError instanceof Error ? syncError.message : "Unknown error", historyId]
            );

            throw syncError;
        }
    } catch (error) {
        console.error("Error triggering sync:", error);
        res.status(500).json({ error: "Failed to sync. Please try again later." });
    }
}

// Get sync history for an integration
export async function handleGetSyncHistory(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const provider = req.params.provider as string;
        const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            `SELECT id, sync_type, status, records_imported, data_types_synced,
                    error_message, error_code, started_at, completed_at, duration_ms
             FROM integration_sync_history
             WHERE user_id = $1 AND provider = $2
             ORDER BY started_at DESC
             LIMIT $3 OFFSET $4`,
            [userId, provider, limit, offset]
        );

        const countResult = await pool.query(
            "SELECT COUNT(*) FROM integration_sync_history WHERE user_id = $1 AND provider = $2",
            [userId, provider]
        );

        res.status(200).json({
            history: result.rows.map(row => ({
                id: row.id,
                syncType: row.sync_type,
                status: row.status,
                recordsImported: row.records_imported,
                dataTypesSynced: row.data_types_synced,
                errorMessage: row.error_message,
                errorCode: row.error_code,
                startedAt: row.started_at?.toISOString(),
                completedAt: row.completed_at?.toISOString(),
                durationMs: row.duration_ms
            })),
            total: parseInt(countResult.rows[0].count),
            limit,
            offset
        });
    } catch (error) {
        console.error("Error fetching sync history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get auto-sync settings (Pro only)
export async function handleGetAutoSyncSettings(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Pro check
        if (!(await isProUser(userId))) {
            res.status(403).json({ error: "Auto-sync is a Pro feature" });
            return;
        }

        const provider = req.params.provider as string;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            `SELECT is_enabled, sync_frequency_minutes, sync_data_types,
                    consecutive_failures, last_failure_at, last_failure_reason,
                    disabled_due_to_failure, failure_notification_sent
             FROM integration_auto_sync
             WHERE user_id = $1 AND provider = $2`,
            [userId, provider]
        );

        if (result.rows.length === 0) {
            // Return defaults
            const config = getProviderConfig(provider);
            res.status(200).json({
                isEnabled: false,
                frequencyMinutes: 60,
                dataTypes: config?.supportedDataTypes || [],
                consecutiveFailures: 0,
                disabledDueToFailure: false
            });
            return;
        }

        const settings = result.rows[0];
        res.status(200).json({
            isEnabled: settings.is_enabled,
            frequencyMinutes: settings.sync_frequency_minutes,
            dataTypes: settings.sync_data_types,
            consecutiveFailures: settings.consecutive_failures,
            lastFailureAt: settings.last_failure_at?.toISOString(),
            lastFailureReason: settings.last_failure_reason,
            disabledDueToFailure: settings.disabled_due_to_failure
        });
    } catch (error) {
        console.error("Error fetching auto-sync settings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update auto-sync settings (Pro only)
export async function handleUpdateAutoSyncSettings(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Pro check
        if (!(await isProUser(userId))) {
            res.status(403).json({ error: "Auto-sync is a Pro feature" });
            return;
        }

        const provider = req.params.provider as string;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        // Check if integration is enabled
        // TEMP: Pass userId to allow user 2 to bypass Strava feature flag
        const isEnabled = await isIntegrationEnabledForUser(provider, userId);
        if (!isEnabled) {
            res.status(403).json({ error: "This integration is currently not available" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Check if user has an active connection
        const connectionResult = await pool.query(
            "SELECT status FROM integration_connections WHERE user_id = $1 AND provider = $2",
            [userId, provider]
        );

        if (connectionResult.rows.length === 0) {
            res.status(400).json({ error: "Integration not connected. Connect first before enabling auto-sync." });
            return;
        }

        if (connectionResult.rows[0].status !== "active") {
            res.status(400).json({ error: "Integration connection is not active" });
            return;
        }

        // Validate request body
        const { isEnabled: enableAutoSync, frequencyMinutes, dataTypes } = req.body;

        // Validate frequency (minimum 15 minutes, maximum 1440 minutes = 24 hours)
        const validatedFrequency = frequencyMinutes
            ? Math.max(15, Math.min(1440, parseInt(frequencyMinutes)))
            : 60;

        // Validate data types
        const config = getProviderConfig(provider);
        const validDataTypes = config?.supportedDataTypes || [];
        const validatedDataTypes = dataTypes
            ? (dataTypes as string[]).filter(dt => validDataTypes.includes(dt as DataType))
            : validDataTypes;

        // Upsert auto-sync settings
        await pool.query(
            `INSERT INTO integration_auto_sync
             (user_id, provider, is_enabled, sync_frequency_minutes, sync_data_types)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, provider)
             DO UPDATE SET
                is_enabled = $3,
                sync_frequency_minutes = $4,
                sync_data_types = $5,
                disabled_due_to_failure = CASE WHEN $3 = true THEN false ELSE integration_auto_sync.disabled_due_to_failure END,
                consecutive_failures = CASE WHEN $3 = true THEN 0 ELSE integration_auto_sync.consecutive_failures END,
                failure_notification_sent = CASE WHEN $3 = true THEN false ELSE integration_auto_sync.failure_notification_sent END,
                updated_at = CURRENT_TIMESTAMP`,
            [userId, provider, enableAutoSync ?? false, validatedFrequency, JSON.stringify(validatedDataTypes)]
        );

        res.status(200).json({
            success: true,
            isEnabled: enableAutoSync ?? false,
            frequencyMinutes: validatedFrequency,
            dataTypes: validatedDataTypes
        });
    } catch (error) {
        console.error("Error updating auto-sync settings:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Enable auto-sync (Pro only)
export async function handleEnableAutoSync(req: Request, res: Response): Promise<void> {
    req.body.isEnabled = true;
    return handleUpdateAutoSyncSettings(req, res);
}

// Disable auto-sync (Pro only)
export async function handleDisableAutoSync(req: Request, res: Response): Promise<void> {
    req.body.isEnabled = false;
    return handleUpdateAutoSyncSettings(req, res);
}

// Strava activity interface
interface StravaActivity {
    id: number;
    name: string;
    type: string;
    sport_type?: string;
    distance: number;
    moving_time: number;
    elapsed_time: number;
    start_date: string;
    start_date_local: string;
    timezone: string;
    calories?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    total_elevation_gain?: number;
    average_speed?: number;
    max_speed?: number;
}

// Map Strava activity types to our activity types
function mapStravaActivityType(stravaType: string): string {
    const typeMap: Record<string, string> = {
        Run: "Running",
        Ride: "Cycling",
        Swim: "Swimming",
        Walk: "Walking",
        Hike: "Hiking",
        WeightTraining: "Weight Training",
        Workout: "Workout",
        Yoga: "Yoga",
        Crossfit: "CrossFit",
        Elliptical: "Elliptical",
        StairStepper: "Stair Climbing",
        Rowing: "Rowing",
        Golf: "Golf",
        Tennis: "Tennis",
        Soccer: "Soccer",
        Basketball: "Basketball"
    };
    return typeMap[stravaType] || stravaType;
}

// Perform actual sync with Strava (exported for initial sync on OAuth connect)
export async function performSync(
    provider: string,
    accessToken: string,
    dataTypes: DataType[],
    userId: number
): Promise<SyncResult> {
    // Only Strava is supported
    if (provider !== "strava") {
        return {
            success: false,
            recordsImported: 0,
            dataTypesSynced: [],
            error: "Provider not supported",
            errorCode: "UNSUPPORTED_PROVIDER"
        };
    }

    const pool = await getPool();
    if (!pool) {
        return {
            success: false,
            recordsImported: 0,
            dataTypesSynced: [],
            error: "Database not available",
            errorCode: "DB_ERROR"
        };
    }

    try {
        let recordsImported = 0;
        const syncedTypes: string[] = [];

        // Sync workouts from Strava
        if (dataTypes.includes("workouts")) {
            console.log(`[Strava Sync] Fetching activities for user ${userId}...`);
            const activities = await fetchStravaActivities(accessToken);
            console.log(`[Strava Sync] Fetched ${activities?.length ?? 0} activities from Strava API`);

            if (activities && activities.length > 0) {
                // Get existing strava_activity_ids to avoid duplicates
                const existingResult = await pool.query(
                    `SELECT strava_activity_id FROM progress_tracking
                     WHERE user_id = $1 AND strava_activity_id IS NOT NULL`,
                    [userId]
                );
                const existingIds = new Set(
                    existingResult.rows.map(r => r.strava_activity_id?.toString())
                );

                let skippedDuplicates = 0;
                for (const activity of activities) {
                    // Skip if already imported
                    if (existingIds.has(activity.id.toString())) {
                        skippedDuplicates++;
                        continue;
                    }

                    const imported = await importStravaActivity(pool, userId, activity);
                    if (imported) {
                        recordsImported++;
                    }
                }
                console.log(`[Strava Sync] Imported ${recordsImported} new activities, skipped ${skippedDuplicates} duplicates`)

                syncedTypes.push("workouts");
            }
        }

        // Sync calories burned (part of activities, already handled above)
        if (dataTypes.includes("calories_burned") && !syncedTypes.includes("workouts")) {
            syncedTypes.push("calories_burned");
        }

        return {
            success: true,
            recordsImported,
            dataTypesSynced: syncedTypes
        };
    } catch (error) {
        console.error("Strava sync error:", error);

        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes("401") || error.message.includes("Unauthorized")) {
                return {
                    success: false,
                    recordsImported: 0,
                    dataTypesSynced: [],
                    error: "Authorization expired. Please reconnect your Strava account.",
                    errorCode: "AUTH_EXPIRED"
                };
            }
            if (error.message.includes("429") || error.message.includes("Rate limit")) {
                return {
                    success: false,
                    recordsImported: 0,
                    dataTypesSynced: [],
                    error: "Too many requests to Strava. Please try again later.",
                    errorCode: "RATE_LIMITED"
                };
            }
        }

        return {
            success: false,
            recordsImported: 0,
            dataTypesSynced: [],
            error: error instanceof Error ? error.message : "Unknown sync error",
            errorCode: "SYNC_ERROR"
        };
    }
}

// Fetch activities from Strava API
async function fetchStravaActivities(accessToken: string): Promise<StravaActivity[]> {
    // Check rate limits before making request
    if (!canMakeReadRequest()) {
        const retryAfter = getRetryAfterMs();
        throw new Error(`Rate limit approaching. Retry after ${Math.ceil(retryAfter / 1000)} seconds.`);
    }

    // Fetch last 30 days of activities (up to 100)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    const response = await stravaFetch(
        `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${thirtyDaysAgo}`,
        {
            headers: { Authorization: `Bearer ${accessToken}` }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Strava Sync] API error (${response.status}):`, errorText);
        throw new Error(`Strava API returned ${response.status}: ${errorText}`);
    }

    const activities = await response.json();
    console.log(`[Strava Sync] API returned ${activities.length} activities`);
    if (activities.length > 0) {
        console.log(`[Strava Sync] First activity: ${activities[0].name} (${activities[0].type}) on ${activities[0].start_date_local}`);
    }
    return activities;
}

// Import a single Strava activity to progress_tracking
async function importStravaActivity(
    pool: import("pg").Pool,
    userId: number,
    activity: StravaActivity
): Promise<boolean> {
    try {
        // Parse activity date (use local date from Strava)
        const activityDate = new Date(activity.start_date_local);
        const dateStr = activityDate.toISOString().split("T")[0];

        // Extract timezone from Strava's timezone string (e.g., "(GMT-08:00) America/Los_Angeles")
        const timezoneMatch = activity.timezone?.match(/\) (.+)$/);
        const timezone = timezoneMatch ? timezoneMatch[1] : "UTC";

        // Map activity type
        const activityType = mapStravaActivityType(activity.type);

        // Build activity data JSON
        const activityData = {
            source: "strava",
            strava_id: activity.id,
            distance_meters: activity.distance,
            moving_time_seconds: activity.moving_time,
            elapsed_time_seconds: activity.elapsed_time,
            average_heartrate: activity.average_heartrate,
            max_heartrate: activity.max_heartrate,
            elevation_gain_meters: activity.total_elevation_gain,
            average_speed_mps: activity.average_speed,
            max_speed_mps: activity.max_speed,
            sport_type: activity.sport_type || activity.type
        };

        // Insert into progress_tracking
        await pool.query(
            `INSERT INTO progress_tracking
             (user_id, activity_type, activity_name, date, timezone, activity_data, calories_burned, strava_activity_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                userId,
                activityType,
                activity.name,
                dateStr,
                timezone,
                JSON.stringify(activityData),
                activity.calories || null,
                activity.id
            ]
        );

        return true;
    } catch (error) {
        console.error(`Failed to import Strava activity ${activity.id}:`, error);
        return false;
    }
}

// Refresh Strava access token if expired
export async function refreshStravaToken(
    refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        console.error("Strava credentials not configured");
        return null;
    }

    try {
        // Token refresh uses rate limits, but we use regular fetch since it's critical
        // and stravaFetch might throw if limits are approached
        const response = await fetch("https://www.strava.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Strava token refresh failed (${response.status}):`, errorText);
            return null;
        }

        const data = await response.json();

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(data.expires_at * 1000)
        };
    } catch (error) {
        console.error("Error refreshing Strava token:", error);
        return null;
    }
}
