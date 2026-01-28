// Auto-sync worker for background synchronization
// Runs periodically to sync data for Pro users with auto-sync enabled

import getPool from "../../db/connection.js";
import { decryptToken, encryptToken } from "../utils/encryptionService.js";
import { isIntegrationEnabled } from "../utils/featureFlagService.js";
import { getProviderConfig } from "../utils/integrationProviders/index.js";
import { sendAutoSyncFailureEmail } from "../utils/emailService.js";
import { refreshStravaToken } from "../handlers/integrationSyncHandler.js";
import { stravaFetch, canMakeReadRequest, getRetryAfterMs } from "../utils/stravaRateLimitService.js";

// Maximum consecutive failures before disabling auto-sync
const MAX_CONSECUTIVE_FAILURES = 3;

// Interface for auto-sync job
interface AutoSyncJob {
    userId: number;
    userEmail: string;
    userName: string;
    provider: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenExpiresAt?: Date;
    syncDataTypes: string[];
    consecutiveFailures: number;
    isProUser: boolean;
}

// Run the auto-sync worker
export async function runAutoSyncWorker(): Promise<void> {
    console.log("[AutoSync] Starting auto-sync worker run...");

    const pool = await getPool();
    if (!pool) {
        console.error("[AutoSync] Database pool not available");
        return;
    }

    try {
        // Find all users with auto-sync enabled that are due for sync
        const jobsResult = await pool.query<AutoSyncJob>(`
            SELECT
                ias.user_id as "userId",
                u.email as "userEmail",
                u.full_name as "userName",
                ias.provider,
                ic.access_token_encrypted as "accessTokenEncrypted",
                ic.refresh_token_encrypted as "refreshTokenEncrypted",
                ic.token_expires_at as "tokenExpiresAt",
                ias.sync_data_types as "syncDataTypes",
                ias.consecutive_failures as "consecutiveFailures",
                u.subscribed as "isProUser"
            FROM integration_auto_sync ias
            JOIN integration_connections ic ON ias.user_id = ic.user_id AND ias.provider = ic.provider
            JOIN users u ON ias.user_id = u.id
            WHERE ias.is_enabled = true
              AND ias.disabled_due_to_failure = false
              AND ic.status = 'active'
              AND u.subscribed = true
              AND (
                  ic.last_sync_at IS NULL
                  OR ic.last_sync_at < NOW() - (ias.sync_frequency_minutes || ' minutes')::interval
              )
            ORDER BY ic.last_sync_at ASC NULLS FIRST
            LIMIT 50
        `);

        console.log(`[AutoSync] Found ${jobsResult.rows.length} jobs to process`);

        for (const job of jobsResult.rows) {
            await processAutoSyncJob(pool, job);
        }

        console.log("[AutoSync] Worker run complete");
    } catch (error) {
        console.error("[AutoSync] Worker error:", error);
    }
}

// Process a single auto-sync job
async function processAutoSyncJob(pool: import("pg").Pool, job: AutoSyncJob): Promise<void> {
    console.log(`[AutoSync] Processing job for user ${job.userId}, provider ${job.provider}`);

    // Check if integration is still enabled via feature flag
    const isEnabled = await isIntegrationEnabled(job.provider);
    if (!isEnabled) {
        console.log(`[AutoSync] Integration ${job.provider} is disabled via feature flag, skipping`);
        return;
    }

    // Verify user is still Pro
    if (!job.isProUser) {
        console.log(`[AutoSync] User ${job.userId} is no longer Pro, disabling auto-sync`);
        await pool.query(
            "UPDATE integration_auto_sync SET is_enabled = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND provider = $2",
            [job.userId, job.provider]
        );
        return;
    }

    const startedAt = new Date();
    let historyId: number | null = null;

    try {
        // Create sync history entry
        const historyResult = await pool.query(
            `INSERT INTO integration_sync_history
             (user_id, provider, sync_type, status, started_at)
             VALUES ($1, $2, 'auto', 'success', $3)
             RETURNING id`,
            [job.userId, job.provider, startedAt]
        );
        historyId = historyResult.rows[0].id;

        // Check if token is expired and refresh if needed
        let accessToken = decryptToken(job.accessTokenEncrypted);

        if (job.tokenExpiresAt && new Date(job.tokenExpiresAt) < new Date()) {
            // Token expired, try to refresh
            if (!job.refreshTokenEncrypted) {
                throw new Error("Access token expired and no refresh token available");
            }

            const refreshToken = decryptToken(job.refreshTokenEncrypted);
            const newTokens = await refreshStravaToken(refreshToken);

            if (!newTokens) {
                throw new Error("Failed to refresh access token");
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
                    job.userId,
                    job.provider,
                    encryptToken(newTokens.accessToken),
                    encryptToken(newTokens.refreshToken),
                    newTokens.expiresAt
                ]
            );

            accessToken = newTokens.accessToken;
            console.log(`[AutoSync] Refreshed token for user ${job.userId}`);
        }

        // Perform sync
        const syncResult = await performStravaSync(pool, job.userId, accessToken, job.syncDataTypes);

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        // Update history
        await pool.query(
            `UPDATE integration_sync_history
             SET status = $1, records_imported = $2, data_types_synced = $3,
                 completed_at = $4, duration_ms = $5
             WHERE id = $6`,
            [
                syncResult.success ? "success" : "failed",
                syncResult.recordsImported,
                JSON.stringify(syncResult.dataTypesSynced),
                completedAt,
                durationMs,
                historyId
            ]
        );

        if (syncResult.success) {
            // Success - reset failure counter and update last sync time
            await pool.query(
                `UPDATE integration_connections
                 SET last_sync_at = CURRENT_TIMESTAMP,
                     last_successful_sync_at = CURRENT_TIMESTAMP,
                     last_error = NULL,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1 AND provider = $2`,
                [job.userId, job.provider]
            );

            await pool.query(
                `UPDATE integration_auto_sync
                 SET consecutive_failures = 0, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1 AND provider = $2`,
                [job.userId, job.provider]
            );

            console.log(`[AutoSync] Successfully synced ${syncResult.recordsImported} records for user ${job.userId}`);
        } else {
            // Failure - handle failure tracking
            await handleSyncFailure(pool, job, syncResult.error || "Unknown error");
        }
    } catch (error) {
        console.error(`[AutoSync] Error processing job for user ${job.userId}:`, error);

        // Update history with error
        if (historyId) {
            await pool.query(
                `UPDATE integration_sync_history
                 SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [error instanceof Error ? error.message : "Unknown error", historyId]
            );
        }

        await handleSyncFailure(pool, job, error instanceof Error ? error.message : "Unknown error");
    }
}

// Handle sync failure - track consecutive failures and disable if threshold reached
async function handleSyncFailure(pool: import("pg").Pool, job: AutoSyncJob, errorMessage: string): Promise<void> {
    const newFailureCount = job.consecutiveFailures + 1;

    // Update connection with error
    await pool.query(
        `UPDATE integration_connections
         SET last_sync_at = CURRENT_TIMESTAMP,
             last_error = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND provider = $2`,
        [job.userId, job.provider, errorMessage]
    );

    if (newFailureCount >= MAX_CONSECUTIVE_FAILURES) {
        // Disable auto-sync and send notification
        console.log(`[AutoSync] Disabling auto-sync for user ${job.userId} after ${newFailureCount} failures`);

        await pool.query(
            `UPDATE integration_auto_sync
             SET is_enabled = false,
                 consecutive_failures = $3,
                 disabled_due_to_failure = true,
                 last_failure_at = CURRENT_TIMESTAMP,
                 last_failure_reason = $4,
                 failure_notification_sent = true,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND provider = $2`,
            [job.userId, job.provider, newFailureCount, errorMessage]
        );

        // Send notification email
        try {
            const config = getProviderConfig(job.provider);
            const providerName = config?.providerName || job.provider;

            await sendAutoSyncFailureEmail(
                job.userEmail,
                job.userName,
                providerName,
                formatUserFriendlyError(errorMessage)
            );

            console.log(`[AutoSync] Sent failure notification to ${job.userEmail}`);
        } catch (emailError) {
            console.error("[AutoSync] Failed to send failure notification email:", emailError);
        }
    } else {
        // Just increment failure counter
        await pool.query(
            `UPDATE integration_auto_sync
             SET consecutive_failures = $3,
                 last_failure_at = CURRENT_TIMESTAMP,
                 last_failure_reason = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND provider = $2`,
            [job.userId, job.provider, newFailureCount, errorMessage]
        );
    }
}

// Format error message for user-friendly display
function formatUserFriendlyError(error: string): string {
    // Map technical errors to user-friendly messages
    if (error.includes("401") || error.includes("unauthorized") || error.includes("Unauthorized")) {
        return "Your authorization has expired. Please reconnect your account.";
    }
    if (error.includes("403") || error.includes("forbidden") || error.includes("Forbidden")) {
        return "Access was denied. You may have revoked permissions.";
    }
    if (error.includes("429") || error.includes("rate limit")) {
        return "Too many requests. The sync will retry automatically.";
    }
    if (error.includes("timeout") || error.includes("ETIMEDOUT")) {
        return "Connection timed out. The service may be temporarily unavailable.";
    }
    if (error.includes("network") || error.includes("ECONNREFUSED")) {
        return "Network error. Please check your connection.";
    }
    return "An unexpected error occurred during synchronization.";
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
        Yoga: "Yoga"
    };
    return typeMap[stravaType] || stravaType;
}

// Perform Strava sync
async function performStravaSync(
    pool: import("pg").Pool,
    userId: number,
    accessToken: string,
    dataTypes: string[]
): Promise<{ success: boolean; recordsImported: number; dataTypesSynced: string[]; error?: string }> {
    console.log(`[AutoSync] Performing Strava sync for user ${userId} with types: ${dataTypes.join(", ")}`);

    // Check rate limits before making request
    if (!canMakeReadRequest()) {
        const retryAfter = getRetryAfterMs();
        console.log(`[AutoSync] Rate limit approaching, skipping sync for user ${userId}. Retry after ${Math.ceil(retryAfter / 1000)}s`);
        return {
            success: false,
            recordsImported: 0,
            dataTypesSynced: [],
            error: `Rate limit approaching. Retry after ${Math.ceil(retryAfter / 1000)} seconds.`
        };
    }

    try {
        let recordsImported = 0;
        const syncedTypes: string[] = [];

        if (dataTypes.includes("workouts") || dataTypes.includes("calories_burned")) {
            // Fetch last 30 days of activities
            const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

            const response = await stravaFetch(
                `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${thirtyDaysAgo}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Strava API returned ${response.status}: ${errorText}`);
            }

            const activities: StravaActivity[] = await response.json();

            // Get existing strava_activity_ids to avoid duplicates
            const existingResult = await pool.query(
                `SELECT strava_activity_id FROM progress_tracking
                 WHERE user_id = $1 AND strava_activity_id IS NOT NULL`,
                [userId]
            );
            const existingIds = new Set(
                existingResult.rows.map(r => r.strava_activity_id?.toString())
            );

            for (const activity of activities) {
                // Skip if already imported
                if (existingIds.has(activity.id.toString())) {
                    continue;
                }

                try {
                    const activityDate = new Date(activity.start_date_local);
                    const dateStr = activityDate.toISOString().split("T")[0];
                    const timezoneMatch = activity.timezone?.match(/\) (.+)$/);
                    const timezone = timezoneMatch ? timezoneMatch[1] : "UTC";

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

                    await pool.query(
                        `INSERT INTO progress_tracking
                         (user_id, activity_type, activity_name, date, timezone, activity_data, calories_burned, strava_activity_id, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                        [
                            userId,
                            mapStravaActivityType(activity.type),
                            activity.name,
                            dateStr,
                            timezone,
                            JSON.stringify(activityData),
                            activity.calories || null,
                            activity.id
                        ]
                    );

                    recordsImported++;
                } catch (insertError) {
                    console.error(`[AutoSync] Failed to import activity ${activity.id}:`, insertError);
                }
            }

            syncedTypes.push("workouts");
            if (dataTypes.includes("calories_burned")) {
                syncedTypes.push("calories_burned");
            }
        }

        return {
            success: true,
            recordsImported,
            dataTypesSynced: syncedTypes
        };
    } catch (error) {
        console.error("[AutoSync] Strava sync error:", error);
        return {
            success: false,
            recordsImported: 0,
            dataTypesSynced: [],
            error: error instanceof Error ? error.message : "Unknown sync error"
        };
    }
}

// Schedule the worker to run periodically (default: 12 hours)
export function startAutoSyncScheduler(intervalMinutes: number = 720): NodeJS.Timeout {
    console.log(`[AutoSync] Starting scheduler with ${intervalMinutes} minute interval`);

    // Run immediately on start
    runAutoSyncWorker().catch(console.error);

    // Then run periodically
    return setInterval(() => {
        runAutoSyncWorker().catch(console.error);
    }, intervalMinutes * 60 * 1000);
}

// Stop the scheduler
export function stopAutoSyncScheduler(intervalId: NodeJS.Timeout): void {
    console.log("[AutoSync] Stopping scheduler");
    clearInterval(intervalId);
}
