// Email template wrapper for admin marketing emails
// Follows the same styling as NoBullFit transactional emails

import dotenv from "dotenv";

dotenv.config();

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM_EMAIL = "support@nobull.fit";

// Wrap custom HTML content in the standard NoBullFit email template
export function buildAdminEmailHtml(subject: string, htmlContent: string, recipientEmail: string, includeUnsubscribe = false): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #18181b;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #18181b; margin: 0; font-size: 24px; font-weight: 600;">NoBullFit</h1>
                </div>

                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px;">
                    ${htmlContent}
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to <a href="mailto:${recipientEmail}" style="color: #27272a; text-decoration: underline;">${recipientEmail}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        If you have any questions, contact us at <a href="mailto:${FROM_EMAIL}" style="color: #27272a; text-decoration: underline;">${FROM_EMAIL}</a>.
                    </p>${includeUnsubscribe ? `
                    <p style="color: #71717a; margin: 12px 0 4px; font-size: 12px;">
                        <a href="${APP_URL}/dashboard/settings" style="color: #71717a; text-decoration: underline;">Unsubscribe from marketing emails</a>
                    </p>` : ""}
                </div>
            </div>
        </body>
        </html>
    `;
}

// Build plain text fallback from HTML content
export function buildAdminEmailText(textContent: string, recipientEmail: string, includeUnsubscribe = false): string {
    return `
${textContent}

---
This email was sent to ${recipientEmail}.
If you have any questions, contact us at ${FROM_EMAIL}.${includeUnsubscribe ? `\n\nUnsubscribe from marketing emails: ${APP_URL}/dashboard/settings` : ""}
    `.trim();
}
