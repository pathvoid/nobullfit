// Webhook Event Processor
// Processes queued Strava webhook events asynchronously

import getPool from "../../db/connection.js";
import { decryptToken, encryptToken } from "../utils/encryptionService.js";
import { stravaFetch, canMakeReadRequest, getRetryAfterMs } from "../utils/stravaRateLimitService.js";
import { refreshStravaToken } from "../handlers/integrationSyncHandler.js";

// Maximum retries for failed events
const MAX_RETRIES = 3;

// Batch size for processing events
const BATCH_SIZE = 10;

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

// Webhook event from database
interface WebhookEvent {
    id: number;
    object_type: string;
    object_id: number;
    aspect_type: string;
    owner_id: number;
    subscription_id: number;
    event_time: Date;
    updates: Record<string, string> | null;
    retry_count: number;
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
        Rowing: "Rowing"
    };
    return typeMap[stravaType] || stravaType;
}

// Run the webhook event processor
export async function runWebhookEventProcessor(): Promise<void> {
    console.log("[WebhookProcessor] Starting event processing run...");

    const pool = await getPool();
    if (!pool) {
        console.error("[WebhookProcessor] Database pool not available");
        return;
    }

    try {
        // Fetch unprocessed events
        const eventsResult = await pool.query<WebhookEvent>(`
            SELECT id, object_type, object_id, aspect_type, owner_id, subscription_id, event_time, updates, retry_count
            FROM strava_webhook_events
            WHERE processed = false AND retry_count < $1
            ORDER BY created_at ASC
            LIMIT $2
        `, [MAX_RETRIES, BATCH_SIZE]);

        console.log(`[WebhookProcessor] Found ${eventsResult.rows.length} events to process`);

        for (const event of eventsResult.rows) {
            await processEvent(pool, event);
        }

        console.log("[WebhookProcessor] Processing run complete");
    } catch (error) {
        console.error("[WebhookProcessor] Error:", error);
    }
}

// Process a single webhook event
async function processEvent(pool: import("pg").Pool, event: WebhookEvent): Promise<void> {
    console.log(`[WebhookProcessor] Processing event ${event.id}: ${event.object_type}:${event.aspect_type}`);

    try {
        // Handle athlete events (deauthorization)
        if (event.object_type === "athlete") {
            await processAthleteEvent(pool, event);
        }
        // Handle activity events
        else if (event.object_type === "activity") {
            await processActivityEvent(pool, event);
        }
        else {
            console.warn(`[WebhookProcessor] Unknown object type: ${event.object_type}`);
        }

        // Mark as processed
        await pool.query(
            `UPDATE strava_webhook_events SET processed = true, processed_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [event.id]
        );

        console.log(`[WebhookProcessor] Event ${event.id} processed successfully`);
    } catch (error) {
        console.error(`[WebhookProcessor] Error processing event ${event.id}:`, error);

        // Increment retry count and store error
        await pool.query(
            `UPDATE strava_webhook_events
             SET retry_count = retry_count + 1, error_message = $2
             WHERE id = $1`,
            [event.id, error instanceof Error ? error.message : "Unknown error"]
        );
    }
}

// Process athlete events (mainly deauthorization)
async function processAthleteEvent(pool: import("pg").Pool, event: WebhookEvent): Promise<void> {
    // Check if this is a deauthorization event
    if (event.updates && event.updates.authorized === "false") {
        console.log(`[WebhookProcessor] Athlete ${event.owner_id} has deauthorized the app`);

        // Find the user by provider_user_id
        const connectionResult = await pool.query(
            `SELECT user_id FROM integration_connections
             WHERE provider = 'strava' AND provider_user_id = $1`,
            [event.owner_id.toString()]
        );

        if (connectionResult.rows.length === 0) {
            console.log(`[WebhookProcessor] No connection found for Strava athlete ${event.owner_id}`);
            return;
        }

        const userId = connectionResult.rows[0].user_id;

        // Update connection status to disconnected
        await pool.query(
            `UPDATE integration_connections
             SET status = 'disconnected', last_error = 'User revoked access via Strava', updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND provider = 'strava'`,
            [userId]
        );

        // Disable auto-sync if enabled
        await pool.query(
            `UPDATE integration_auto_sync
             SET is_enabled = false, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND provider = 'strava'`,
            [userId]
        );

        console.log(`[WebhookProcessor] Marked Strava connection as disconnected for user ${userId}`);
    }
}

// Process activity events (create, update, delete)
async function processActivityEvent(pool: import("pg").Pool, event: WebhookEvent): Promise<void> {
    // Find the user by owner_id (Strava athlete ID)
    const connectionResult = await pool.query(
        `SELECT user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at
         FROM integration_connections
         WHERE provider = 'strava' AND provider_user_id = $1 AND status = 'active'`,
        [event.owner_id.toString()]
    );

    if (connectionResult.rows.length === 0) {
        console.log(`[WebhookProcessor] No active connection found for Strava athlete ${event.owner_id}`);
        return;
    }

    const connection = connectionResult.rows[0];
    const userId = connection.user_id;

    // Handle delete event
    if (event.aspect_type === "delete") {
        const result = await pool.query(
            `DELETE FROM progress_tracking WHERE user_id = $1 AND strava_activity_id = $2 RETURNING id`,
            [userId, event.object_id]
        );

        if (result.rowCount && result.rowCount > 0) {
            console.log(`[WebhookProcessor] Deleted activity ${event.object_id} for user ${userId}`);
        }
        return;
    }

    // For create and update, we need to fetch activity details from Strava
    if (event.aspect_type === "create" || event.aspect_type === "update") {
        // Check rate limits
        if (!canMakeReadRequest()) {
            const retryAfter = getRetryAfterMs();
            throw new Error(`Rate limit approaching. Retry after ${Math.ceil(retryAfter / 1000)} seconds.`);
        }

        // Get access token, refresh if needed
        let accessToken = decryptToken(connection.access_token_encrypted);

        if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
            if (!connection.refresh_token_encrypted) {
                throw new Error("Access token expired and no refresh token available");
            }

            const refreshToken = decryptToken(connection.refresh_token_encrypted);
            const newTokens = await refreshStravaToken(refreshToken);

            if (!newTokens) {
                throw new Error("Failed to refresh access token");
            }

            // Update stored tokens
            await pool.query(
                `UPDATE integration_connections
                 SET access_token_encrypted = $3, refresh_token_encrypted = $4, token_expires_at = $5, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1 AND provider = $2`,
                [userId, "strava", encryptToken(newTokens.accessToken), encryptToken(newTokens.refreshToken), newTokens.expiresAt]
            );

            accessToken = newTokens.accessToken;
        }

        // Fetch activity from Strava
        const response = await stravaFetch(
            `https://www.strava.com/api/v3/activities/${event.object_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`[WebhookProcessor] Activity ${event.object_id} not found on Strava`);
                return;
            }
            throw new Error(`Strava API returned ${response.status}`);
        }

        const activity: StravaActivity = await response.json();

        // Parse activity data
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

        if (event.aspect_type === "create") {
            // Check if already exists
            const existingResult = await pool.query(
                `SELECT id FROM progress_tracking WHERE user_id = $1 AND strava_activity_id = $2`,
                [userId, activity.id]
            );

            if (existingResult.rows.length > 0) {
                console.log(`[WebhookProcessor] Activity ${activity.id} already exists for user ${userId}`);
                return;
            }

            // Insert new activity
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

            console.log(`[WebhookProcessor] Created activity ${activity.id} for user ${userId}`);
        }
        else if (event.aspect_type === "update") {
            // Update existing activity
            const result = await pool.query(
                `UPDATE progress_tracking
                 SET activity_type = $3, activity_name = $4, date = $5, timezone = $6,
                     activity_data = $7, calories_burned = $8, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = $1 AND strava_activity_id = $2`,
                [
                    userId,
                    activity.id,
                    mapStravaActivityType(activity.type),
                    activity.name,
                    dateStr,
                    timezone,
                    JSON.stringify(activityData),
                    activity.calories || null
                ]
            );

            if (result.rowCount && result.rowCount > 0) {
                console.log(`[WebhookProcessor] Updated activity ${activity.id} for user ${userId}`);
            } else {
                // Activity doesn't exist locally, create it
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
                console.log(`[WebhookProcessor] Created activity ${activity.id} for user ${userId} (via update event)`);
            }
        }
    }
}

// Schedule the processor to run periodically (default: every 30 seconds)
export function startWebhookEventScheduler(intervalSeconds: number = 30): NodeJS.Timeout {
    console.log(`[WebhookProcessor] Starting scheduler with ${intervalSeconds} second interval`);

    // Run immediately on start
    runWebhookEventProcessor().catch(console.error);

    // Then run periodically
    return setInterval(() => {
        runWebhookEventProcessor().catch(console.error);
    }, intervalSeconds * 1000);
}

// Stop the scheduler
export function stopWebhookEventScheduler(intervalId: NodeJS.Timeout): void {
    console.log("[WebhookProcessor] Stopping scheduler");
    clearInterval(intervalId);
}
