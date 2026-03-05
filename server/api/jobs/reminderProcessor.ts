// Reminder Processor
// Processes due reminders on a 60-second interval and sends email/SMS notifications

import getPool from "../../db/connection.js";
import { sendEmail } from "../utils/emailService.js";
import { buildReminderEmailHtml, buildReminderEmailText } from "../utils/reminderEmailTemplates.js";
import { sendSMS } from "../utils/twilioService.js";
import { shortenUrl } from "../utils/linkShortenerService.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Batch size for processing reminders
const BATCH_SIZE = 20;

// Maximum reminder fires per user per day (Pro users)
const MAX_FIRES_PER_DAY = 20;

// Due reminder from database with joined user data
interface DueReminder {
    id: number;
    user_id: number;
    title: string;
    message: string;
    delivery_type: string;
    schedule_type: string;
    recurrence_pattern: string | null;
    recurrence_days: number[] | null;
    recurrence_time: string;
    timezone: string;
    email: string;
    full_name: string;
    phone_number: string | null;
    phone_verified: boolean;
    reminder_unsubscribe_token: string | null;
}

// Replace URLs in a message with shortened versions for SMS
async function shortenUrlsInMessage(message: string): Promise<string> {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.match(urlRegex);
    if (!urls) return message;

    let result = message;
    for (const url of urls) {
        const shortened = await shortenUrl(url);
        if (shortened) {
            result = result.replace(url, shortened.shortUrl);
        }
    }
    return result;
}

// Compute the next fire time for a recurring reminder (in UTC)
function computeNextRecurringFireAt(
    recurrencePattern: string,
    recurrenceDays: number[] | null,
    recurrenceTime: string,
    timezone: string,
    afterDate: Date = new Date()
): Date | null {
    if (!recurrenceTime) return null;

    const [hours, minutes] = recurrenceTime.split(":").map(Number);

    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const dayFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short"
    });

    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const nowDayStr = dayFormatter.format(afterDate);
    const nowDay = dayMap[nowDayStr] ?? 0;

    // Determine valid days
    let validDays: number[];
    switch (recurrencePattern) {
        case "daily":
            validDays = [0, 1, 2, 3, 4, 5, 6];
            break;
        case "weekly":
            validDays = recurrenceDays && recurrenceDays.length > 0 ? [recurrenceDays[0]] : [nowDay];
            break;
        case "weekdays":
            validDays = [1, 2, 3, 4, 5];
            break;
        case "weekends":
            validDays = [0, 6];
            break;
        case "custom":
            validDays = recurrenceDays && recurrenceDays.length > 0 ? recurrenceDays : [0, 1, 2, 3, 4, 5, 6];
            break;
        default:
            validDays = [0, 1, 2, 3, 4, 5, 6];
    }

    // Start from tomorrow (since we just fired today)
    for (let offset = 1; offset <= 7; offset++) {
        const candidateDay = (nowDay + offset) % 7;

        if (validDays.includes(candidateDay)) {
            const candidateDate = new Date(afterDate);
            candidateDate.setDate(candidateDate.getDate() + offset);
            const candidateDateStr = dateFormatter.format(candidateDate);
            const [year, month, day] = candidateDateStr.split("-").map(Number);

            // Convert local time on that date to UTC
            return localToUtc(year, month, day, hours, minutes, timezone);
        }
    }

    return null;
}

// Process all due reminders
async function runReminderProcessor(): Promise<void> {
    const pool = await getPool();
    if (!pool) return;

    try {
        // Query all active reminders that are due
        // Phone data comes from user_settings (LEFT JOIN since row may not exist)
        const dueResult = await pool.query(
            `SELECT r.id, r.user_id, r.title, r.message, r.delivery_type, r.schedule_type,
                    r.recurrence_pattern, r.recurrence_days, r.recurrence_time, r.timezone,
                    u.email, u.full_name, u.reminder_unsubscribe_token,
                    COALESCE(us.phone_number, NULL) as phone_number,
                    COALESCE(us.phone_verified, false) as phone_verified
             FROM reminders r
             JOIN users u ON r.user_id = u.id
             LEFT JOIN user_settings us ON r.user_id = us.user_id
             WHERE r.is_active = true AND r.next_fire_at <= NOW()
             ORDER BY r.next_fire_at ASC
             LIMIT $1`,
            [BATCH_SIZE]
        );

        if (dueResult.rows.length === 0) return;

        console.log(`[ReminderProcessor] Processing ${dueResult.rows.length} due reminder(s)`);

        for (const reminder of dueResult.rows as DueReminder[]) {
            try {
                await processReminder(pool, reminder);
            } catch (error) {
                console.error(`[ReminderProcessor] Error processing reminder ${reminder.id}:`, error);
                // Log the failure
                await pool.query(
                    `INSERT INTO reminder_logs (reminder_id, user_id, delivery_type, status, error_message, sent_at)
                     VALUES ($1, $2, $3, 'failed', $4, NOW())`,
                    [reminder.id, reminder.user_id, reminder.delivery_type, String(error)]
                );
            }
        }
    } catch (error) {
        console.error("[ReminderProcessor] Error in processor cycle:", error);
    }
}

// Convert a local time (year, month, day, hours, minutes) to UTC using the given timezone
function localToUtc(year: number, month: number, day: number, hours: number, minutes: number, timezone: string): Date {
    // Start with a guess: treat the local components as UTC
    const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

    // See what this UTC instant looks like in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const parts = formatter.formatToParts(guess);
    const localH = Number(parts.find(p => p.type === "hour")?.value);
    const localM = Number(parts.find(p => p.type === "minute")?.value);
    const localD = Number(parts.find(p => p.type === "day")?.value);

    // Offset = how much the timezone shifted our guess
    const offsetMs = ((localD - day) * 86400000) + ((localH - hours) * 3600000) + ((localM - minutes) * 60000);
    return new Date(guess.getTime() - offsetMs);
}

// Process a single reminder
async function processReminder(pool: Awaited<ReturnType<typeof getPool>>, reminder: DueReminder): Promise<void> {
    if (!pool) return;

    // Check daily fire limit for this user
    const now = new Date();
    const todayFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: reminder.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const todayStr = todayFormatter.format(now);
    const [year, month, day] = todayStr.split("-").map(Number);

    // Convert user's local midnight and end-of-day to proper UTC
    const startUtc = localToUtc(year, month, day, 0, 0, reminder.timezone);
    const endUtc = localToUtc(year, month, day, 23, 59, reminder.timezone);

    const fireCountResult = await pool.query(
        `SELECT COUNT(*) as fire_count FROM reminder_logs
         WHERE user_id = $1 AND sent_at >= $2 AND sent_at <= $3 AND status = 'sent'`,
        [reminder.user_id, startUtc.toISOString(), endUtc.toISOString()]
    );

    const fireCount = parseInt(fireCountResult.rows[0]?.fire_count || "0", 10);
    if (fireCount >= MAX_FIRES_PER_DAY) {
        console.log(`[ReminderProcessor] User ${reminder.user_id} reached daily limit (${MAX_FIRES_PER_DAY}), skipping reminder ${reminder.id}`);
        await pool.query(
            `INSERT INTO reminder_logs (reminder_id, user_id, delivery_type, status, error_message, sent_at)
             VALUES ($1, $2, $3, 'skipped', 'Daily limit reached', NOW())`,
            [reminder.id, reminder.user_id, reminder.delivery_type]
        );
        // Still update next_fire_at so we don't keep trying the same one
        await updateReminderAfterFire(pool, reminder);
        return;
    }

    // Send the reminder based on delivery type
    if (reminder.delivery_type === "email") {
        await sendEmailReminder(pool, reminder);
    } else if (reminder.delivery_type === "sms") {
        await sendSmsReminder(pool, reminder);
    }

    // Update the reminder after successful fire
    await updateReminderAfterFire(pool, reminder);
}

// Send an email reminder
async function sendEmailReminder(pool: Awaited<ReturnType<typeof getPool>>, reminder: DueReminder): Promise<void> {
    if (!pool) return;

    const unsubscribeUrl = reminder.reminder_unsubscribe_token
        ? `${APP_URL}/api/reminders/unsubscribe/${reminder.reminder_unsubscribe_token}`
        : `${APP_URL}/dashboard/reminders`;

    const htmlBody = buildReminderEmailHtml(
        reminder.title,
        reminder.message,
        reminder.full_name,
        reminder.email,
        unsubscribeUrl
    );

    const textBody = buildReminderEmailText(
        reminder.title,
        reminder.message,
        reminder.full_name,
        unsubscribeUrl
    );

    await sendEmail(reminder.email, `Reminder: ${reminder.title}`, htmlBody, textBody);

    await pool.query(
        `INSERT INTO reminder_logs (reminder_id, user_id, delivery_type, status, sent_at)
         VALUES ($1, $2, 'email', 'sent', NOW())`,
        [reminder.id, reminder.user_id]
    );

    console.log(`[ReminderProcessor] Sent email reminder ${reminder.id} to ${reminder.email}`);
}

// Send an SMS reminder
async function sendSmsReminder(pool: Awaited<ReturnType<typeof getPool>>, reminder: DueReminder): Promise<void> {
    if (!pool) return;

    if (!reminder.phone_number || !reminder.phone_verified) {
        console.log(`[ReminderProcessor] Skipping SMS reminder ${reminder.id} - phone not verified`);
        await pool.query(
            `INSERT INTO reminder_logs (reminder_id, user_id, delivery_type, status, error_message, sent_at)
             VALUES ($1, $2, 'sms', 'skipped', 'Phone not verified', NOW())`,
            [reminder.id, reminder.user_id]
        );
        return;
    }

    // Build SMS body and shorten any URLs
    let smsBody = `NoBullFit Reminder: ${reminder.title}\n${reminder.message}`;

    // Shorten URLs in the message
    smsBody = await shortenUrlsInMessage(smsBody);

    // Add unsubscribe note (Twilio handles STOP automatically at messaging service level)
    smsBody += "\n\nReply STOP to unsubscribe";

    await sendSMS(reminder.phone_number, smsBody);

    await pool.query(
        `INSERT INTO reminder_logs (reminder_id, user_id, delivery_type, status, sent_at)
         VALUES ($1, $2, 'sms', 'sent', NOW())`,
        [reminder.id, reminder.user_id]
    );

    console.log(`[ReminderProcessor] Sent SMS reminder ${reminder.id} to ${reminder.phone_number}`);
}

// Update reminder state after firing
async function updateReminderAfterFire(pool: Awaited<ReturnType<typeof getPool>>, reminder: DueReminder): Promise<void> {
    if (!pool) return;

    if (reminder.schedule_type === "once") {
        // One-time reminder: deactivate after firing
        await pool.query(
            "UPDATE reminders SET is_active = false, last_fired_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [reminder.id]
        );
    } else if (reminder.schedule_type === "recurring") {
        // Recurring reminder: compute next fire time
        const nextFireAt = computeNextRecurringFireAt(
            reminder.recurrence_pattern || "daily",
            reminder.recurrence_days,
            reminder.recurrence_time,
            reminder.timezone,
            new Date()
        );

        await pool.query(
            "UPDATE reminders SET next_fire_at = $1, last_fired_at = NOW(), updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [nextFireAt ? nextFireAt.toISOString() : null, reminder.id]
        );
    }
}

// Schedule the processor to run periodically (default: every 60 seconds)
export function startReminderScheduler(intervalSeconds: number = 60): NodeJS.Timeout {
    console.log(`[ReminderProcessor] Starting scheduler with ${intervalSeconds} second interval`);

    // Run immediately on start
    runReminderProcessor().catch(console.error);

    // Then run periodically
    return setInterval(() => {
        runReminderProcessor().catch(console.error);
    }, intervalSeconds * 1000);
}

// Stop the scheduler
export function stopReminderScheduler(intervalId: NodeJS.Timeout): void {
    console.log("[ReminderProcessor] Stopping scheduler");
    clearInterval(intervalId);
}
