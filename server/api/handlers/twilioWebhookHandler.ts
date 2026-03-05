// Twilio incoming SMS webhook handler
// Processes opt-out replies (STOP, etc.) to sync database state

import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { validateTwilioSignature } from "../utils/twilioService.js";

// Twilio recognized opt-out keywords
const OPT_OUT_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

// Handle incoming SMS from Twilio
export async function handleTwilioIncoming(req: Request, res: Response): Promise<void> {
    try {
        // Validate the request is from Twilio
        const signature = req.headers["x-twilio-signature"] as string;
        const webhookUrl = `${process.env.APP_URL || "https://nobull.fit"}/api/webhooks/twilio/incoming`;

        if (!signature || !validateTwilioSignature(signature, webhookUrl, req.body)) {
            res.status(403).send("<Response></Response>");
            return;
        }

        const body = (req.body?.Body || "").trim().toUpperCase();
        const from = req.body?.From || "";

        // Only process opt-out keywords
        if (!OPT_OUT_KEYWORDS.has(body)) {
            // Not an opt-out message, respond with empty TwiML
            res.type("text/xml").status(200).send("<Response></Response>");
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.type("text/xml").status(200).send("<Response></Response>");
            return;
        }

        // Find user by phone number in user_settings
        const userResult = await pool.query(
            "SELECT user_id FROM user_settings WHERE phone_number = $1",
            [from]
        );

        if (userResult.rows.length === 0) {
            // No matching user, nothing to update
            res.type("text/xml").status(200).send("<Response></Response>");
            return;
        }

        const userId = userResult.rows[0].user_id;

        // Clear phone number and deactivate all SMS reminders
        await pool.query(
            "UPDATE user_settings SET phone_number = NULL, phone_verified = false, communication_sms = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
            [userId]
        );

        await pool.query(
            "UPDATE reminders SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND delivery_type = 'sms'",
            [userId]
        );

        console.log(`[TwilioWebhook] User ${userId} opted out via SMS STOP from ${from}`);

        // Empty TwiML response (Twilio sends its own STOP confirmation)
        res.type("text/xml").status(200).send("<Response></Response>");
    } catch (error) {
        console.error("[TwilioWebhook] Error processing incoming SMS:", error);
        res.type("text/xml").status(200).send("<Response></Response>");
    }
}
