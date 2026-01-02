// Email service using Amazon SES
// Handles sending emails for authentication and password reset

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import dotenv from "dotenv";

// Ensure dotenv is loaded
dotenv.config();

const FROM_EMAIL = "support@nobull.fit";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Lazy initialize SES client to ensure environment variables are loaded
let sesClient: SESClient | null = null;

function getSESClient(): SESClient {
    if (!sesClient) {
        const region = process.env.AWS_REGION || "us-east-1";
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

        // Validate AWS credentials
        if (!accessKeyId || !secretAccessKey) {
            throw new Error("AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.");
        }

        sesClient = new SESClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }
    return sesClient;
}

// Send email using SES
async function sendEmail(to: string, subject: string, htmlBody: string, textBody: string): Promise<void> {
    const client = getSESClient();
    
    const command = new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
            ToAddresses: [to]
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: "UTF-8"
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: "UTF-8"
                },
                Text: {
                    Data: textBody,
                    Charset: "UTF-8"
                }
            }
        }
    });

    await client.send(command);
}

// Send welcome email after successful registration
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = "Welcome to NoBullFit!";
    
    const htmlBody = `
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Welcome to NoBullFit!</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Thank you for joining NoBullFit! We're excited to have you on board.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        You can now start tracking your health journey with us. Get started by logging into your account.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/sign-in" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Sign In</a>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        If you have any questions, feel free to reach out to us at <a href="mailto:${FROM_EMAIL}" style="color: #27272a; text-decoration: underline;">${FROM_EMAIL}</a>.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to <a href="mailto:${email}" style="color: #27272a; text-decoration: underline;">${email}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        If you didn't create an account, please ignore this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Welcome to NoBullFit!

Hi ${name},

Thank you for joining NoBullFit! We're excited to have you on board.

You can now start tracking your health journey with us. Get started by logging into your account at ${APP_URL}/sign-in

If you have any questions, feel free to reach out to us at ${FROM_EMAIL}.

Best regards,
The NoBullFit Team

---
This email was sent to ${email}. If you didn't create an account, please ignore this email.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
    const subject = "Reset Your NoBullFit Password";
    
    const htmlBody = `
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Password Reset Request</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        We received a request to reset your password for your NoBullFit account.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Click the button below to reset your password. This link will expire in 1 hour.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Reset Password</a>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0; font-size: 14px;">
                        Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #18181b; margin: 8px 0; font-size: 12px; word-break: break-all;">
                        <a href="${resetLink}" style="color: #27272a; text-decoration: underline;">${resetLink}</a>
                    </p>
                    
                    <div style="margin-top: 30px; padding: 16px; background-color: #27272a; border-radius: 6px;">
                        <p style="color: #ffffff; margin: 0; font-size: 12px; font-weight: 500;">Security Notice</p>
                        <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 12px;">
                            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                        </p>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to <a href="mailto:${email}" style="color: #27272a; text-decoration: underline;">${email}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        If you didn't request a password reset, please ignore this email.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This link expires in 1 hour.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Password Reset Request

Hi ${name},

We received a request to reset your password for your NoBullFit account.

Click the link below to reset your password. This link will expire in 1 hour.

${resetLink}

Security Notice: If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

Best regards,
The NoBullFit Team

---
This email was sent to ${email}. If you didn't request a password reset, please ignore this email.
This link expires in 1 hour.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send email change confirmation email
export async function sendEmailChangeConfirmationEmail(newEmail: string, currentEmail: string, token: string): Promise<void> {
    const confirmationUrl = `${APP_URL}/confirm-email-change?token=${token}`;
    
    const subject = "Confirm Your Email Change - NoBullFit";
    
    const htmlBody = `
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Confirm Your Email Change</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hello,</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        You requested to change your email address from <strong>${currentEmail}</strong> to <strong>${newEmail}</strong>.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        To complete this change, please click the button below to confirm your new email address:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${confirmationUrl}" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Confirm Email Change</a>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0; font-size: 14px;">
                        Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #18181b; margin: 8px 0; font-size: 12px; word-break: break-all;">
                        <a href="${confirmationUrl}" style="color: #27272a; text-decoration: underline;">${confirmationUrl}</a>
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0; font-size: 14px;">
                        This link will expire in 24 hours. If you didn't request this change, you can safely ignore this email and your email address will remain unchanged.
                    </p>
                    
                    <div style="margin-top: 30px; padding: 16px; background-color: #27272a; border-radius: 6px;">
                        <p style="color: #ffffff; margin: 0; font-size: 12px; font-weight: 500;">Security Notice</p>
                        <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 12px;">
                            If you didn't request this email change, please contact our support team immediately at <a href="mailto:${FROM_EMAIL}" style="color: #ffffff; text-decoration: underline;">${FROM_EMAIL}</a>.
                        </p>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} NoBullFit. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const textBody = `
Confirm Your Email Change - NoBullFit

Hello,

You requested to change your email address from ${currentEmail} to ${newEmail}.

To complete this change, please visit the following link:
${confirmationUrl}

This link will expire in 24 hours. If you didn't request this change, you can safely ignore this email and your email address will remain unchanged.

Security Notice:
If you didn't request this email change, please contact our support team immediately at ${FROM_EMAIL}.

© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;
    
    await sendEmail(newEmail, subject, htmlBody, textBody);
}

// Send password change notification email
export async function sendPasswordChangeNotificationEmail(email: string, name: string): Promise<void> {
    const subject = "Your NoBullFit Password Has Been Changed";
    
    const htmlBody = `
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Password Changed Successfully</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        This is to confirm that your NoBullFit account password has been successfully changed.
                    </p>
                    
                    <div style="margin-top: 24px; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                        <p style="color: #92400e; margin: 0; font-size: 14px;">
                            <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately at <a href="mailto:${FROM_EMAIL}" style="color: #92400e; text-decoration: underline;">${FROM_EMAIL}</a> and we'll help secure your account.
                        </p>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        If you made this change, you can safely ignore this email.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to <a href="mailto:${email}" style="color: #27272a; text-decoration: underline;">${email}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        © ${new Date().getFullYear()} NoBullFit. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Password Changed Successfully - NoBullFit

Hi ${name},

This is to confirm that your NoBullFit account password has been successfully changed.

Security Notice:
If you didn't make this change, please contact our support team immediately at ${FROM_EMAIL} and we'll help secure your account.

If you made this change, you can safely ignore this email.

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;
    
    await sendEmail(email, subject, htmlBody, textBody);
}

// Send account deletion confirmation email
export async function sendAccountDeletionConfirmationEmail(email: string, name: string): Promise<void> {
    const subject = "Your NoBullFit Account Has Been Deleted";
    
    const htmlBody = `
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Account Deleted</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        This is to confirm that your NoBullFit account has been permanently deleted.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        All of your data, including recipes, favorites, grocery lists, and other account information, has been permanently removed from our systems.
                    </p>
                    
                    <div style="margin-top: 24px; padding: 16px; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 4px;">
                        <p style="color: #991b1b; margin: 0; font-size: 14px;">
                            <strong>Important:</strong> This action cannot be undone. If you didn't request this deletion, please contact our support team immediately at <a href="mailto:${FROM_EMAIL}" style="color: #991b1b; text-decoration: underline;">${FROM_EMAIL}</a>.
                        </p>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        If you change your mind, you can create a new account at any time.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to <a href="mailto:${email}" style="color: #27272a; text-decoration: underline;">${email}</a>.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        © ${new Date().getFullYear()} NoBullFit. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Account Deleted - NoBullFit

Hi ${name},

This is to confirm that your NoBullFit account has been permanently deleted.

All of your data, including recipes, favorites, grocery lists, and other account information, has been permanently removed from our systems.

Important: This action cannot be undone. If you didn't request this deletion, please contact our support team immediately at ${FROM_EMAIL}.

If you change your mind, you can create a new account at any time.

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;
    
    await sendEmail(email, subject, htmlBody, textBody);
}

// Send grocery list email
export async function sendGroceryListEmail(
    email: string,
    name: string,
    listName: string,
    items: Array<{
        food_label: string;
        food_data?: { brand?: string; unit?: string };
        quantity: number;
        unit?: string | null;
    }>
): Promise<void> {
    const subject = `Your Grocery List: ${listName} - NoBullFit`;

    // Build items HTML
    const itemsHtml = items
        .map(
            (item) => {
                const unit = item.unit || item.food_data?.unit || "";
                const quantityDisplay = unit ? `${item.quantity} ${unit}` : item.quantity;
                return `
        <tr style="border-bottom: 1px solid #e4e4e7;">
            <td style="padding: 12px 0; color: #18181b;">
                ${item.food_label}
            </td>
            <td style="padding: 12px 0; color: #71717a; text-align: right;">
                ${item.food_data?.brand || "—"}
            </td>
            <td style="padding: 12px 0; color: #18181b; text-align: right; font-weight: 600;">
                ${quantityDisplay}
            </td>
        </tr>
    `;
            }
        )
        .join("");

    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #18181b;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #18181b; margin: 0; font-size: 24px; font-weight: 600;">NoBullFit</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px;">
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Your Grocery List</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Here's your grocery list from NoBullFit:
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0; font-size: 20px; font-weight: 600;">
                        ${listName}
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 12px 0; font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e4e4e7;">Item</th>
                                <th style="text-align: right; padding: 12px 0; font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e4e4e7;">Brand</th>
                                <th style="text-align: right; padding: 12px 0; font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e4e4e7;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    
                    <p style="color: #18181b; margin: 16px 0;">Happy shopping!</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">Best regards,<br>The NoBullFit Team</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e4e4e7;">
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        This email was sent to ${email}.
                    </p>
                    <p style="color: #71717a; margin: 4px 0; font-size: 12px;">
                        You can manage your grocery lists at <a href="${APP_URL}/dashboard/grocery-lists" style="color: #27272a; text-decoration: underline;">${APP_URL}/dashboard/grocery-lists</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Your Grocery List - NoBullFit

Hi ${name},

Here's your grocery list:

${listName}

${items
    .map(
        (item) => {
            const unit = item.unit || item.food_data?.unit || "";
            const quantityDisplay = unit ? `${item.quantity} ${unit}` : item.quantity;
            return `• ${item.food_label}${item.food_data?.brand ? ` (${item.food_data.brand})` : ""} - Quantity: ${quantityDisplay}`;
        }
    )
    .join("\n")}

Happy shopping!

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
You can manage your grocery lists at ${APP_URL}/dashboard/grocery-lists
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}