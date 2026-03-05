// Email templates for reminder notifications
// Follows the same styling as other NoBullFit transactional emails

import dotenv from "dotenv";

dotenv.config();

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM_EMAIL = "support@nobull.fit";

// Build HTML email for a reminder notification
export function buildReminderEmailHtml(
    title: string,
    message: string,
    userName: string,
    email: string,
    unsubscribeUrl: string
): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reminder: ${title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #18181b;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #18181b; margin: 0; font-size: 24px; font-weight: 600;">NoBullFit</h1>
                </div>

                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px;">
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Reminder: ${title}</h2>

                    <p style="color: #18181b; margin: 16px 0;">Hi ${userName},</p>

                    <p style="color: #18181b; margin: 16px 0;">${message}</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard/reminders" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">View Your Reminders</a>
                    </div>

                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This reminder was sent to <a href="mailto:${email}" style="color: #27272a; text-decoration: underline;">${email}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        <a href="${unsubscribeUrl}" style="color: #27272a; text-decoration: underline;">Unsubscribe from reminders</a>
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        If you have any questions, contact us at <a href="mailto:${FROM_EMAIL}" style="color: #27272a; text-decoration: underline;">${FROM_EMAIL}</a>.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Build plain text email for a reminder notification
export function buildReminderEmailText(
    title: string,
    message: string,
    userName: string,
    unsubscribeUrl: string
): string {
    return `
Reminder: ${title}

Hi ${userName},

${message}

View your reminders: ${APP_URL}/dashboard/reminders

Best regards,
The NoBullFit Team

---
To unsubscribe from reminders, visit: ${unsubscribeUrl}
    `.trim();
}
