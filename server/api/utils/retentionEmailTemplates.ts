import dotenv from "dotenv";

dotenv.config();

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM_EMAIL = "support@nobull.fit";

// Determine the last activity type for personalization
export type LastActivityType = "food" | "activity" | "weight" | "mixed";

// Get a personalized message based on the user's primary tracking type
function getPersonalizedMessage(activityType: LastActivityType, daysInactive: number): string {
    const dayText = daysInactive === 1 ? "day" : "days";

    switch (activityType) {
        case "food":
            return `It's been ${daysInactive} ${dayText} since your last nutrition log. People who consistently track what they eat tend to stay more aware of their habits and make better choices over time. Even logging one meal a day keeps the habit alive.`;
        case "activity":
            return `It's been ${daysInactive} ${dayText} since your last workout log. Keeping a record of your sessions helps you spot patterns, track improvements, and stay motivated. Even a short entry counts toward building that momentum back.`;
        case "weight":
            return `It's been ${daysInactive} ${dayText} since your last weigh-in. Regular check-ins help you stay informed about trends rather than guessing. It takes seconds and gives you a clearer picture of your progress over time.`;
        default:
            return `It's been ${daysInactive} ${dayText} since you last tracked anything. Self-monitoring is one of the most effective ways to stay on course with health and fitness goals. Picking it back up — even with small logs — can make a meaningful difference.`;
    }
}

// Get a subject line based on the user's primary tracking type
export function getRetentionSubject(activityType: LastActivityType): string {
    switch (activityType) {
        case "food":
            return "A quick note about your nutrition tracking";
        case "activity":
            return "Your workout streak — worth picking back up";
        case "weight":
            return "A quick check-in on your progress";
        default:
            return "Your tracking data is waiting for you";
    }
}

// Build HTML email for retention/re-engagement
export function buildRetentionEmailHtml(
    userName: string,
    email: string,
    activityType: LastActivityType,
    daysInactive: number
): string {
    const firstName = userName.split(" ")[0];
    const message = getPersonalizedMessage(activityType, daysInactive);

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>We miss you at NoBullFit</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #18181b;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #18181b; margin: 0; font-size: 24px; font-weight: 600;">NoBullFit</h1>
                </div>

                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px;">
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Hey ${firstName}, just checking in!</h2>

                    <p style="color: #18181b; margin: 16px 0;">${message}</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Get Back On Track</a>
                    </div>

                    <p style="color: #71717a; font-size: 14px; margin: 16px 0;">No pressure — we're just here to help you stay on track. You've got this.</p>

                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to <a href="mailto:${email}" style="color: #27272a; text-decoration: underline;">${email}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        <a href="${APP_URL}/dashboard/settings" style="color: #27272a; text-decoration: underline;">Unsubscribe from these emails</a>
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

// Build plain text email for retention/re-engagement
export function buildRetentionEmailText(
    userName: string,
    activityType: LastActivityType,
    daysInactive: number
): string {
    const firstName = userName.split(" ")[0];
    const message = getPersonalizedMessage(activityType, daysInactive);

    return `
Hey ${firstName}, just checking in!

${message}

Get back on track: ${APP_URL}/dashboard

No pressure — we're just here to help you stay on track. You've got this.

Best regards,
The NoBullFit Team

---
To unsubscribe from these emails, visit: ${APP_URL}/dashboard/settings
    `.trim();
}
