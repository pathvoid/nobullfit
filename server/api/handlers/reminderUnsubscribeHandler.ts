// Reminder unsubscribe handler - public endpoint (no auth required)
// Allows users to unsubscribe from email reminders via a unique token link

import type { Request, Response } from "express";
import getPool from "../../db/connection.js";

// Handle unsubscribe from email reminders (public endpoint)
export async function handleUnsubscribeReminders(req: Request, res: Response): Promise<void> {
    try {
        const { token } = req.params;

        if (!token || token.length < 32) {
            res.status(400).send(buildHtmlPage("Invalid Link", "This unsubscribe link is invalid or has expired."));
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).send(buildHtmlPage("Error", "Something went wrong. Please try again later."));
            return;
        }

        // Find user by unsubscribe token
        const userResult = await pool.query(
            "SELECT id, full_name FROM users WHERE reminder_unsubscribe_token = $1",
            [token]
        );

        if (userResult.rows.length === 0) {
            res.status(404).send(buildHtmlPage("Invalid Link", "This unsubscribe link is invalid or has expired."));
            return;
        }

        const userId = userResult.rows[0].id;
        const userName = userResult.rows[0].full_name;

        // Deactivate all email reminders for this user
        await pool.query(
            "UPDATE reminders SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND delivery_type = 'email'",
            [userId]
        );

        res.status(200).send(buildHtmlPage(
            "Unsubscribed Successfully",
            `Hi ${userName}, you have been unsubscribed from all email reminders. You can re-enable reminders at any time from your dashboard.`
        ));
    } catch (error) {
        console.error("Error unsubscribing from reminders:", error);
        res.status(500).send(buildHtmlPage("Error", "Something went wrong. Please try again later."));
    }
}

// Build a simple HTML page for unsubscribe responses
function buildHtmlPage(title: string, message: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title} - NoBullFit</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #18181b; background-color: #fafafa;">
            <div style="max-width: 600px; margin: 80px auto; padding: 20px; text-align: center;">
                <h1 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">NoBullFit</h1>
                <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #e4e4e7;">
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">${title}</h2>
                    <p style="color: #52525b; margin: 16px 0;">${message}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}
