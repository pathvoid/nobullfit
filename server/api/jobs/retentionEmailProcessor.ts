import getPool from "../../db/connection.js";
import { sendEmail } from "../utils/emailService.js";
import {
    buildRetentionEmailHtml,
    buildRetentionEmailText,
    getRetentionSubject,
    type LastActivityType
} from "../utils/retentionEmailTemplates.js";

// Number of days of inactivity before sending a retention email
const INACTIVITY_THRESHOLD_DAYS = 5;

// Minimum days between retention emails for the same user
const COOLDOWN_DAYS = 30;

// Process batch size
const BATCH_SIZE = 50;

// Eligible inactive user from the database query
interface InactiveUser {
    id: number;
    email: string;
    full_name: string;
    food_count: number;
    activity_count: number;
    weight_count: number;
    last_tracking_date: string;
}

// Determine what the user primarily tracks based on total entry count
function determinePrimaryActivityType(user: InactiveUser): LastActivityType {
    const counts: { type: LastActivityType; count: number }[] = [
        { type: "food", count: user.food_count },
        { type: "activity", count: user.activity_count },
        { type: "weight", count: user.weight_count }
    ];

    const active = counts.filter(c => c.count > 0);
    if (active.length === 0) return "mixed";

    active.sort((a, b) => b.count - a.count);

    // If the top two are close in count (within 30%), treat as mixed
    if (active.length > 1) {
        const ratio = active[1].count / active[0].count;
        if (ratio >= 0.7) return "mixed";
    }

    return active[0].type;
}

// Calculate how many days since the user last tracked anything
function calculateDaysInactive(lastTrackingDate: string): number {
    const lastDate = new Date(lastTrackingDate);
    const now = new Date();
    const diffMs = now.getTime() - lastDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Find and email inactive users
async function runRetentionEmailProcessor(): Promise<void> {
    const pool = await getPool();
    if (!pool) return;

    try {
        // Find users who:
        // 1. Have communication_email enabled (or default true)
        // 2. Have tracked something before (food, activity, or weight)
        // 3. Haven't tracked anything in INACTIVITY_THRESHOLD_DAYS+ days
        // 4. Haven't received a retention email in COOLDOWN_DAYS days
        // Uses entry counts to determine the user's primary tracking type
        // so personalization reflects what they actually use, not what they tried once
        const result = await pool.query(
            `SELECT
                u.id, u.email, u.full_name,
                COALESCE((SELECT COUNT(*) FROM food_tracking WHERE user_id = u.id), 0)::int as food_count,
                COALESCE((SELECT COUNT(*) FROM progress_tracking WHERE user_id = u.id), 0)::int as activity_count,
                COALESCE((SELECT COUNT(*) FROM weight_tracking WHERE user_id = u.id), 0)::int as weight_count,
                GREATEST(
                    COALESCE((SELECT MAX(date) FROM food_tracking WHERE user_id = u.id), '1970-01-01'::date),
                    COALESCE((SELECT MAX(date) FROM progress_tracking WHERE user_id = u.id), '1970-01-01'::date),
                    COALESCE((SELECT MAX(date) FROM weight_tracking WHERE user_id = u.id), '1970-01-01'::date)
                )::text as last_tracking_date
            FROM users u
            LEFT JOIN user_settings us ON us.user_id = u.id
            WHERE COALESCE(us.communication_email, true) = true
            AND (
                EXISTS (SELECT 1 FROM food_tracking WHERE user_id = u.id)
                OR EXISTS (SELECT 1 FROM progress_tracking WHERE user_id = u.id)
                OR EXISTS (SELECT 1 FROM weight_tracking WHERE user_id = u.id)
            )
            AND GREATEST(
                COALESCE((SELECT MAX(date) FROM food_tracking WHERE user_id = u.id), '1970-01-01'::date),
                COALESCE((SELECT MAX(date) FROM progress_tracking WHERE user_id = u.id), '1970-01-01'::date),
                COALESCE((SELECT MAX(date) FROM weight_tracking WHERE user_id = u.id), '1970-01-01'::date)
            ) < CURRENT_DATE - INTERVAL '${INACTIVITY_THRESHOLD_DAYS} days'
            AND NOT EXISTS (
                SELECT 1 FROM retention_emails
                WHERE user_id = u.id AND sent_at > NOW() - INTERVAL '${COOLDOWN_DAYS} days'
            )
            LIMIT $1`,
            [BATCH_SIZE]
        );

        if (result.rows.length === 0) return;

        console.log(`[RetentionEmailProcessor] Found ${result.rows.length} inactive user(s) to email`);

        for (const user of result.rows as InactiveUser[]) {
            try {
                await sendRetentionEmail(pool, user);
            } catch (error) {
                console.error(`[RetentionEmailProcessor] Error sending to user ${user.id}:`, error);
            }
        }
    } catch (error) {
        console.error("[RetentionEmailProcessor] Error in processor cycle:", error);
    }
}

// Send a retention email to a single user and log it
async function sendRetentionEmail(
    pool: Awaited<ReturnType<typeof getPool>>,
    user: InactiveUser
): Promise<void> {
    if (!pool) return;

    const activityType = determinePrimaryActivityType(user);
    const daysInactive = calculateDaysInactive(user.last_tracking_date);
    const subject = getRetentionSubject(activityType);

    const htmlBody = buildRetentionEmailHtml(
        user.full_name,
        user.email,
        activityType,
        daysInactive
    );

    const textBody = buildRetentionEmailText(
        user.full_name,
        activityType,
        daysInactive
    );

    await sendEmail(user.email, subject, htmlBody, textBody);

    // Log the sent email to prevent future sends within the cooldown
    await pool.query(
        `INSERT INTO retention_emails (user_id, email_type, sent_at) VALUES ($1, 'inactive_nudge', NOW())`,
        [user.id]
    );

    console.log(`[RetentionEmailProcessor] Sent retention email to ${user.email} (inactive ${daysInactive} days, type: ${activityType})`);
}

// Delay before first run to allow the database pool to initialize
const INITIAL_DELAY_MS = 30000;

// Start the retention email scheduler (default: every 24 hours)
export function startRetentionEmailScheduler(intervalSeconds: number = 86400): NodeJS.Timeout {
    console.log(`[RetentionEmailProcessor] Starting scheduler with ${intervalSeconds} second interval (first run in ${INITIAL_DELAY_MS / 1000}s)`);

    // Delay the first run so the database pool is ready
    setTimeout(() => {
        runRetentionEmailProcessor().catch(console.error);
    }, INITIAL_DELAY_MS);

    // Then run periodically
    return setInterval(() => {
        runRetentionEmailProcessor().catch(console.error);
    }, intervalSeconds * 1000);
}

// Stop the scheduler
export function stopRetentionEmailScheduler(intervalId: NodeJS.Timeout): void {
    console.log("[RetentionEmailProcessor] Stopping scheduler");
    clearInterval(intervalId);
}
