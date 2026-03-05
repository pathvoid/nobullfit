// Reminders handler - CRUD operations for user reminders
// Free users: max 5 reminders. Pro users: unlimited, max 20 fires/day.

import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import crypto from "crypto";

// Helper function to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
        if (cookieToken) {
            token = cookieToken;
        }
    }

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    return decoded ? decoded.userId : null;
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

// Compute the next fire time in UTC for a reminder
function computeNextFireAt(
    scheduleType: string,
    scheduledAt: string | null,
    recurrencePattern: string | null,
    recurrenceDays: number[] | null,
    recurrenceTime: string,
    timezone: string,
    afterDate: Date = new Date()
): Date | null {
    if (scheduleType === "once" && scheduledAt) {
        return new Date(scheduledAt);
    }

    if (scheduleType !== "recurring" || !recurrencePattern || !recurrenceTime) {
        return null;
    }

    // Parse recurrence time (HH:MM or HH:MM:SS)
    const [hours, minutes] = recurrenceTime.split(":").map(Number);

    // Get current date/time in user's timezone
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

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    const nowTimeStr = timeFormatter.format(afterDate);
    const [nowHours, nowMinutes] = nowTimeStr.split(":").map(Number);

    // Map day names to numbers (0=Sun..6=Sat)
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const nowDayStr = dayFormatter.format(afterDate);
    const nowDay = dayMap[nowDayStr] ?? 0;

    // Check if the time has already passed today
    const timePassed = nowHours > hours || (nowHours === hours && nowMinutes >= minutes);

    // Determine which days are valid based on pattern
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

    // Find next valid day
    for (let offset = 0; offset <= 7; offset++) {
        const candidateDay = (nowDay + offset) % 7;

        // Skip today if time has already passed
        if (offset === 0 && timePassed) continue;

        if (validDays.includes(candidateDay)) {
            // Get the candidate date in user's timezone
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

// Get user's reminders with gating check
export async function handleGetReminders(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        // Check if user is Pro (subscribed)
        const userResult = await pool.query(
            "SELECT subscribed FROM users WHERE id = $1",
            [userId]
        );

        if (!userResult.rows[0]) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const isPro = userResult.rows[0].subscribed === true;

        // Get phone status from user_settings
        const settingsResult = await pool.query(
            "SELECT phone_number, phone_verified FROM user_settings WHERE user_id = $1",
            [userId]
        );
        const phoneVerified = settingsResult.rows[0]?.phone_verified === true;
        const phoneNumber = settingsResult.rows[0]?.phone_number || null;

        // Check gating: count distinct days logged across food_tracking + progress_tracking
        let isGated = false;
        let daysLogged = 0;

        if (!isPro) {
            const daysResult = await pool.query(
                `SELECT COUNT(*) as days_logged FROM (
                    SELECT DISTINCT date FROM food_tracking WHERE user_id = $1
                    UNION
                    SELECT DISTINCT date FROM progress_tracking WHERE user_id = $1
                ) combined_days`,
                [userId]
            );
            daysLogged = parseInt(daysResult.rows[0]?.days_logged || "0", 10);
            isGated = daysLogged < 10;
        }

        // If gated, return early with gating info
        if (isGated) {
            res.status(200).json({
                reminders: [],
                isGated: true,
                isPro,
                daysLogged,
                phoneVerified,
                phoneNumber
            });
            return;
        }

        // Fetch user's reminders
        const remindersResult = await pool.query(
            `SELECT id, title, message, delivery_type, schedule_type, scheduled_at,
                    recurrence_pattern, recurrence_days, recurrence_time, timezone,
                    is_active, next_fire_at, last_fired_at, created_at, updated_at
             FROM reminders
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        res.status(200).json({
            reminders: remindersResult.rows,
            isGated: false,
            isPro,
            daysLogged,
            phoneVerified,
            phoneNumber
        });
    } catch (error) {
        console.error("Error getting reminders:", error);
        res.status(500).json({ error: "Failed to load reminders" });
    }
}

// Create a new reminder
export async function handleCreateReminder(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        const {
            title,
            message,
            deliveryType,
            scheduleType,
            scheduledAt,
            recurrencePattern,
            recurrenceDays,
            recurrenceTime,
            timezone
        } = req.body;

        // Validate required fields
        if (!title || !message || !deliveryType || !scheduleType || !recurrenceTime || !timezone) {
            res.status(400).json({ error: "Missing required fields: title, message, deliveryType, scheduleType, recurrenceTime, timezone" });
            return;
        }

        if (title.length > 255) {
            res.status(400).json({ error: "Title must be 255 characters or fewer" });
            return;
        }

        if (!["email", "sms"].includes(deliveryType)) {
            res.status(400).json({ error: "deliveryType must be 'email' or 'sms'" });
            return;
        }

        if (!["once", "recurring"].includes(scheduleType)) {
            res.status(400).json({ error: "scheduleType must be 'once' or 'recurring'" });
            return;
        }

        // For SMS, verify user has a verified phone number
        if (deliveryType === "sms") {
            const phoneResult = await pool.query(
                "SELECT phone_verified FROM user_settings WHERE user_id = $1",
                [userId]
            );
            if (!phoneResult.rows[0]?.phone_verified) {
                res.status(400).json({ error: "You must verify your phone number in Settings before creating SMS reminders" });
                return;
            }
        }

        // Sanitize message: collapse 3+ consecutive newlines into 2
        const sanitizedMessage = message.replace(/\n{3,}/g, "\n\n");

        // Enforce character limits (SMS: 110 for single segment, email: 2000)
        const messageLimit = deliveryType === "sms" ? 110 : 2000;
        if (sanitizedMessage.length > messageLimit) {
            res.status(400).json({
                error: `Message must be ${messageLimit} characters or fewer for ${deliveryType === "sms" ? "SMS" : "email"} delivery`
            });
            return;
        }

        // Validate schedule-specific fields
        if (scheduleType === "once") {
            if (!scheduledAt) {
                res.status(400).json({ error: "scheduledAt is required for one-time reminders" });
                return;
            }
            // Check that scheduled time is in the future
            if (new Date(scheduledAt) <= new Date()) {
                res.status(400).json({ error: "Scheduled time must be in the future" });
                return;
            }
        }

        if (scheduleType === "recurring") {
            if (!recurrencePattern) {
                res.status(400).json({ error: "recurrencePattern is required for recurring reminders" });
                return;
            }
            if (!["daily", "weekly", "weekdays", "weekends", "custom"].includes(recurrencePattern)) {
                res.status(400).json({ error: "Invalid recurrence pattern" });
                return;
            }
            if ((recurrencePattern === "weekly" || recurrencePattern === "custom") && (!recurrenceDays || recurrenceDays.length === 0)) {
                res.status(400).json({ error: "recurrenceDays is required for weekly and custom patterns" });
                return;
            }
        }

        // Check plan-based reminder limits
        const userPlanResult = await pool.query(
            "SELECT subscribed FROM users WHERE id = $1",
            [userId]
        );
        const isProUser = userPlanResult.rows[0]?.subscribed === true;

        const totalRemindersResult = await pool.query(
            "SELECT COUNT(*) as total_count FROM reminders WHERE user_id = $1",
            [userId]
        );
        const totalCount = parseInt(totalRemindersResult.rows[0]?.total_count || "0", 10);

        // Free users: max 5 total reminders
        if (!isProUser && totalCount >= 5) {
            res.status(400).json({ error: "Free plan allows up to 5 reminders. Upgrade to Pro for unlimited reminders." });
            return;
        }

        // Pro users: check daily fire limit (20/day)
        if (isProUser) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const fireLimitResult = await pool.query(
                `SELECT COUNT(*) as fire_count FROM reminder_logs
                 WHERE user_id = $1 AND sent_at >= $2 AND sent_at <= $3 AND status = 'sent'`,
                [userId, todayStart.toISOString(), todayEnd.toISOString()]
            );

            const activeRemindersResult = await pool.query(
                "SELECT COUNT(*) as active_count FROM reminders WHERE user_id = $1 AND is_active = true",
                [userId]
            );

            const todayFires = parseInt(fireLimitResult.rows[0]?.fire_count || "0", 10);
            const activeCount = parseInt(activeRemindersResult.rows[0]?.active_count || "0", 10);

            if (todayFires >= 20 || (scheduleType === "recurring" && activeCount >= 20)) {
                res.status(400).json({ error: "You have reached the maximum of 20 reminder notifications per day." });
                return;
            }
        }

        // Compute next fire time
        const nextFireAt = computeNextFireAt(
            scheduleType,
            scheduledAt,
            recurrencePattern,
            recurrenceDays,
            recurrenceTime,
            timezone
        );

        // Ensure user has an unsubscribe token (for email reminders)
        if (deliveryType === "email") {
            const tokenResult = await pool.query(
                "SELECT reminder_unsubscribe_token FROM users WHERE id = $1",
                [userId]
            );
            if (!tokenResult.rows[0]?.reminder_unsubscribe_token) {
                const unsubscribeToken = crypto.randomBytes(32).toString("hex");
                await pool.query(
                    "UPDATE users SET reminder_unsubscribe_token = $1 WHERE id = $2",
                    [unsubscribeToken, userId]
                );
            }
        }

        // Insert the reminder
        const result = await pool.query(
            `INSERT INTO reminders (user_id, title, message, delivery_type, schedule_type, scheduled_at,
                                    recurrence_pattern, recurrence_days, recurrence_time, timezone,
                                    is_active, next_fire_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
             RETURNING id, title, message, delivery_type, schedule_type, scheduled_at,
                       recurrence_pattern, recurrence_days, recurrence_time, timezone,
                       is_active, next_fire_at, last_fired_at, created_at, updated_at`,
            [
                userId, title, sanitizedMessage, deliveryType, scheduleType,
                scheduledAt || null,
                recurrencePattern || null,
                recurrenceDays || null,
                recurrenceTime,
                timezone,
                nextFireAt ? nextFireAt.toISOString() : null
            ]
        );

        res.status(201).json({ reminder: result.rows[0] });
    } catch (error) {
        console.error("Error creating reminder:", error);
        res.status(500).json({ error: "Failed to create reminder" });
    }
}

// Update an existing reminder
export async function handleUpdateReminder(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        const reminderId = parseInt(req.params.id, 10);
        if (isNaN(reminderId)) {
            res.status(400).json({ error: "Invalid reminder ID" });
            return;
        }

        // Verify ownership
        const ownerCheck = await pool.query(
            "SELECT id FROM reminders WHERE id = $1 AND user_id = $2",
            [reminderId, userId]
        );
        if (ownerCheck.rows.length === 0) {
            res.status(404).json({ error: "Reminder not found" });
            return;
        }

        const {
            title,
            message,
            deliveryType,
            scheduleType,
            scheduledAt,
            recurrencePattern,
            recurrenceDays,
            recurrenceTime,
            timezone
        } = req.body;

        // Validate required fields
        if (!title || !message || !deliveryType || !scheduleType || !recurrenceTime || !timezone) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        if (title.length > 255) {
            res.status(400).json({ error: "Title must be 255 characters or fewer" });
            return;
        }

        // For SMS, verify user has a verified phone number
        if (deliveryType === "sms") {
            const phoneResult = await pool.query(
                "SELECT phone_verified FROM user_settings WHERE user_id = $1",
                [userId]
            );
            if (!phoneResult.rows[0]?.phone_verified) {
                res.status(400).json({ error: "You must verify your phone number in Settings before using SMS reminders" });
                return;
            }
        }

        // Sanitize message: collapse 3+ consecutive newlines into 2
        const sanitizedMessage = message.replace(/\n{3,}/g, "\n\n");

        // Enforce character limits (SMS: 110 for single segment, email: 2000)
        const messageLimit = deliveryType === "sms" ? 110 : 2000;
        if (sanitizedMessage.length > messageLimit) {
            res.status(400).json({
                error: `Message must be ${messageLimit} characters or fewer for ${deliveryType === "sms" ? "SMS" : "email"} delivery`
            });
            return;
        }

        // Validate one-time schedule
        if (scheduleType === "once" && !scheduledAt) {
            res.status(400).json({ error: "scheduledAt is required for one-time reminders" });
            return;
        }

        if (scheduleType === "once" && new Date(scheduledAt) <= new Date()) {
            res.status(400).json({ error: "Scheduled time must be in the future" });
            return;
        }

        // Validate recurring schedule
        if (scheduleType === "recurring" && !recurrencePattern) {
            res.status(400).json({ error: "recurrencePattern is required for recurring reminders" });
            return;
        }

        if (scheduleType === "recurring" && (recurrencePattern === "weekly" || recurrencePattern === "custom") && (!recurrenceDays || recurrenceDays.length === 0)) {
            res.status(400).json({ error: "recurrenceDays is required for weekly and custom patterns" });
            return;
        }

        // Recompute next fire time
        const nextFireAt = computeNextFireAt(
            scheduleType,
            scheduledAt,
            recurrencePattern,
            recurrenceDays,
            recurrenceTime,
            timezone
        );

        // Ensure unsubscribe token exists for email
        if (deliveryType === "email") {
            const tokenResult = await pool.query(
                "SELECT reminder_unsubscribe_token FROM users WHERE id = $1",
                [userId]
            );
            if (!tokenResult.rows[0]?.reminder_unsubscribe_token) {
                const unsubscribeToken = crypto.randomBytes(32).toString("hex");
                await pool.query(
                    "UPDATE users SET reminder_unsubscribe_token = $1 WHERE id = $2",
                    [unsubscribeToken, userId]
                );
            }
        }

        const result = await pool.query(
            `UPDATE reminders
             SET title = $1, message = $2, delivery_type = $3, schedule_type = $4,
                 scheduled_at = $5, recurrence_pattern = $6, recurrence_days = $7,
                 recurrence_time = $8, timezone = $9, next_fire_at = $10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 AND user_id = $12
             RETURNING id, title, message, delivery_type, schedule_type, scheduled_at,
                       recurrence_pattern, recurrence_days, recurrence_time, timezone,
                       is_active, next_fire_at, last_fired_at, created_at, updated_at`,
            [
                title, sanitizedMessage, deliveryType, scheduleType,
                scheduledAt || null,
                recurrencePattern || null,
                recurrenceDays || null,
                recurrenceTime,
                timezone,
                nextFireAt ? nextFireAt.toISOString() : null,
                reminderId, userId
            ]
        );

        res.status(200).json({ reminder: result.rows[0] });
    } catch (error) {
        console.error("Error updating reminder:", error);
        res.status(500).json({ error: "Failed to update reminder" });
    }
}

// Delete a reminder
export async function handleDeleteReminder(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        const reminderId = parseInt(req.params.id, 10);
        if (isNaN(reminderId)) {
            res.status(400).json({ error: "Invalid reminder ID" });
            return;
        }

        const result = await pool.query(
            "DELETE FROM reminders WHERE id = $1 AND user_id = $2 RETURNING id",
            [reminderId, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Reminder not found" });
            return;
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting reminder:", error);
        res.status(500).json({ error: "Failed to delete reminder" });
    }
}

// Toggle a reminder's active state
export async function handleToggleReminder(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        const reminderId = parseInt(req.params.id, 10);
        if (isNaN(reminderId)) {
            res.status(400).json({ error: "Invalid reminder ID" });
            return;
        }

        // Get current state
        const current = await pool.query(
            `SELECT id, is_active, schedule_type, scheduled_at, recurrence_pattern,
                    recurrence_days, recurrence_time, timezone
             FROM reminders WHERE id = $1 AND user_id = $2`,
            [reminderId, userId]
        );

        if (current.rows.length === 0) {
            res.status(404).json({ error: "Reminder not found" });
            return;
        }

        const reminder = current.rows[0];
        const newActive = !reminder.is_active;

        // If re-activating, recompute next_fire_at
        let nextFireAt = null;
        if (newActive) {
            nextFireAt = computeNextFireAt(
                reminder.schedule_type,
                reminder.scheduled_at ? reminder.scheduled_at.toISOString() : null,
                reminder.recurrence_pattern,
                reminder.recurrence_days,
                reminder.recurrence_time,
                reminder.timezone
            );

            // For one-time reminders in the past, don't allow re-activation
            if (reminder.schedule_type === "once" && (!nextFireAt || nextFireAt <= new Date())) {
                res.status(400).json({ error: "Cannot re-activate a one-time reminder with a past scheduled time" });
                return;
            }
        }

        const result = await pool.query(
            `UPDATE reminders
             SET is_active = $1, next_fire_at = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 AND user_id = $4
             RETURNING id, title, message, delivery_type, schedule_type, scheduled_at,
                       recurrence_pattern, recurrence_days, recurrence_time, timezone,
                       is_active, next_fire_at, last_fired_at, created_at, updated_at`,
            [newActive, nextFireAt ? nextFireAt.toISOString() : null, reminderId, userId]
        );

        res.status(200).json({ reminder: result.rows[0] });
    } catch (error) {
        console.error("Error toggling reminder:", error);
        res.status(500).json({ error: "Failed to toggle reminder" });
    }
}
