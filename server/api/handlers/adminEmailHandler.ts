import type { Request, Response } from "express";
import getAdminPool from "../../db/adminConnection.js";
import { sendEmail } from "../utils/emailService.js";
import { buildAdminEmailHtml, buildAdminEmailText } from "../utils/adminEmailTemplate.js";

// Strip HTML tags for plain text fallback
function stripHtml(html: string): string {
    return html
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/h[1-6]>/gi, "\n\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Send marketing email to selected or eligible users (dev-only)
export async function handleSendAdminEmail(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({ error: "Not found" });
        return;
    }

    try {
        const pool = await getAdminPool();
        if (!pool) {
            res.status(500).json({ error: "Admin database connection not available" });
            return;
        }

        const { subject, htmlContent, recipientType, recipientIds } = req.body;

        if (!subject || !htmlContent) {
            res.status(400).json({ error: "Subject and content are required" });
            return;
        }

        const validTypes = ["selected", "eligible", "eligible_subscribed", "eligible_unsubscribed"];
        if (!validTypes.includes(recipientType)) {
            res.status(400).json({ error: "Invalid recipient type" });
            return;
        }

        // Fetch recipients
        let recipients: Array<{ id: number; email: string; full_name: string }>;

        if (recipientType === "selected") {
            if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
                res.status(400).json({ error: "No recipients selected" });
                return;
            }
            const placeholders = recipientIds.map((_: number, i: number) => `$${i + 1}`).join(", ");
            const result = await pool.query(
                `SELECT id, email, full_name FROM users WHERE id IN (${placeholders})`,
                recipientIds
            );
            recipients = result.rows;
        } else if (recipientType === "eligible_subscribed") {
            // Eligible users with an active subscription
            const result = await pool.query(`
                SELECT u.id, u.email, u.full_name
                FROM users u
                LEFT JOIN user_settings us ON us.user_id = u.id
                WHERE COALESCE(us.communication_email, true) = true
                AND u.subscribed = true
            `);
            recipients = result.rows;
        } else if (recipientType === "eligible_unsubscribed") {
            // Eligible users without a subscription
            const result = await pool.query(`
                SELECT u.id, u.email, u.full_name
                FROM users u
                LEFT JOIN user_settings us ON us.user_id = u.id
                WHERE COALESCE(us.communication_email, true) = true
                AND (u.subscribed = false OR u.subscribed IS NULL)
            `);
            recipients = result.rows;
        } else {
            // All eligible users (communication_email = true)
            const result = await pool.query(`
                SELECT u.id, u.email, u.full_name
                FROM users u
                LEFT JOIN user_settings us ON us.user_id = u.id
                WHERE COALESCE(us.communication_email, true) = true
            `);
            recipients = result.rows;
        }

        if (recipients.length === 0) {
            res.status(400).json({ error: "No recipients found" });
            return;
        }

        let sent = 0;
        let failed = 0;

        // Include unsubscribe link for bulk/eligible sends
        const includeUnsubscribe = recipientType !== "selected";

        // Send emails sequentially to avoid SES rate limits
        for (const recipient of recipients) {
            try {
                const html = buildAdminEmailHtml(subject, htmlContent, recipient.email, includeUnsubscribe);
                const text = buildAdminEmailText(stripHtml(htmlContent), recipient.email, includeUnsubscribe);
                await sendEmail(recipient.email, subject, html, text);
                sent++;
            } catch (error) {
                console.error(`Failed to send email to ${recipient.email}:`, error);
                failed++;
            }
        }

        res.status(200).json({ sent, failed, total: recipients.length });
    } catch (error) {
        console.error("Error sending admin email:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get count of eligible email recipients (dev-only)
export async function handleGetEligibleCount(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({ error: "Not found" });
        return;
    }

    try {
        const pool = await getAdminPool();
        if (!pool) {
            res.status(500).json({ error: "Admin database connection not available" });
            return;
        }

        // Get total eligible, eligible with subscription, and eligible without subscription
        const result = await pool.query(`
            SELECT
                COUNT(*) as count,
                COUNT(*) FILTER (WHERE u.subscribed = true) as subscribed_count,
                COUNT(*) FILTER (WHERE u.subscribed = false OR u.subscribed IS NULL) as unsubscribed_count
            FROM users u
            LEFT JOIN user_settings us ON us.user_id = u.id
            WHERE COALESCE(us.communication_email, true) = true
        `);

        const row = result.rows[0];
        res.status(200).json({
            count: parseInt(String(row?.count)) || 0,
            subscribedCount: parseInt(String(row?.subscribed_count)) || 0,
            unsubscribedCount: parseInt(String(row?.unsubscribed_count)) || 0
        });
    } catch (error) {
        console.error("Error fetching eligible count:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Preview email with full template (dev-only)
export async function handlePreviewAdminEmail(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({ error: "Not found" });
        return;
    }

    const { subject, htmlContent, recipientType } = req.body;

    if (!subject || !htmlContent) {
        res.status(400).json({ error: "Subject and content are required" });
        return;
    }

    const includeUnsubscribe = recipientType !== "selected";
    const previewHtml = buildAdminEmailHtml(subject, htmlContent, "user@example.com", includeUnsubscribe);
    res.status(200).json({ html: previewHtml });
}
