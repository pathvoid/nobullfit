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

// Send subscription activated email (when user subscribes to Pro)
export async function sendSubscriptionActivatedEmail(email: string, name: string): Promise<void> {
    const subject = "Welcome to NoBullFit Pro!";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Thank You for Supporting NoBullFit!</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Thank you so much for subscribing to NoBullFit Pro! Your support means the world to us.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        At NoBullFit, our mission is to make nutrition tracking simple, honest, and accessible to everyone. Your subscription directly helps us achieve this goal.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <p style="color: #166534; margin: 0 0 12px 0; font-weight: 600;">Where your support goes:</p>
                        <ul style="color: #166534; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Keeping NoBullFit running and accessible to all users</li>
                            <li style="margin-bottom: 8px;">Developing new features and improvements</li>
                            <li style="margin-bottom: 8px;">Maintaining our food database with accurate nutrition data</li>
                            <li style="margin-bottom: 8px;">Supporting a small, dedicated team passionate about health</li>
                        </ul>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Because of supporters like you, we can keep NoBullFit free of ads, free of gimmicks, and focused on what matters: helping people make healthier choices without the nonsense.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Go to Dashboard</a>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        You can manage your subscription anytime from the Billing page in your dashboard.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">With gratitude,<br>The NoBullFit Team</p>
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
Thank You for Supporting NoBullFit!

Hi ${name},

Thank you so much for subscribing to NoBullFit Pro! Your support means the world to us.

At NoBullFit, our mission is to make nutrition tracking simple, honest, and accessible to everyone. Your subscription directly helps us achieve this goal.

Where your support goes:
- Keeping NoBullFit running and accessible to all users
- Developing new features and improvements
- Maintaining our food database with accurate nutrition data
- Supporting a small, dedicated team passionate about health

Because of supporters like you, we can keep NoBullFit free of ads, free of gimmicks, and focused on what matters: helping people make healthier choices without the nonsense.

You can manage your subscription anytime from the Billing page in your dashboard.

With gratitude,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send subscription canceled email
export async function sendSubscriptionCanceledEmail(email: string, name: string, endDate?: string): Promise<void> {
    const subject = "Your NoBullFit Pro Subscription Has Been Canceled";
    const endDateText = endDate ? `Your Pro access will remain active until ${endDate}.` : "Your Pro access has ended.";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Subscription Canceled</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        We're sorry to see you go! Your NoBullFit Pro subscription has been canceled.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        ${endDateText}
                    </p>
                    
                    <div style="margin: 24px 0; padding: 16px; background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 4px;">
                        <p style="color: #854d0e; margin: 0; font-size: 14px;">
                            <strong>Note:</strong> You'll continue to have access to all free features. Your saved recipes and data will remain intact.
                        </p>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Changed your mind? You can resubscribe anytime from your Billing page.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard/billing" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Manage Subscription</a>
                    </div>
                    
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
Your NoBullFit Pro Subscription Has Been Canceled

Hi ${name},

We're sorry to see you go! Your NoBullFit Pro subscription has been canceled.

${endDateText}

Note: You'll continue to have access to all free features. Your saved recipes and data will remain intact.

Changed your mind? You can resubscribe anytime from your Billing page at ${APP_URL}/dashboard/billing

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send subscription paused email
export async function sendSubscriptionPausedEmail(email: string, name: string, resumeDate?: string): Promise<void> {
    const subject = "Your NoBullFit Pro Subscription Has Been Paused";
    const resumeText = resumeDate ? `Your subscription will automatically resume on ${resumeDate}.` : "You can resume your subscription anytime from the Billing page.";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Subscription Paused</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Your NoBullFit Pro subscription has been paused. You won't be charged while your subscription is paused.
                    </p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        ${resumeText}
                    </p>
                    
                    <div style="margin: 24px 0; padding: 16px; background-color: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
                        <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
                            <strong>Note:</strong> While paused, you'll have access to free features only. Your saved data will remain safe and available when you resume.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard/billing" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Resume Subscription</a>
                    </div>
                    
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
Your NoBullFit Pro Subscription Has Been Paused

Hi ${name},

Your NoBullFit Pro subscription has been paused. You won't be charged while your subscription is paused.

${resumeText}

Note: While paused, you'll have access to free features only. Your saved data will remain safe and available when you resume.

You can resume your subscription at ${APP_URL}/dashboard/billing

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send subscription resumed email
export async function sendSubscriptionResumedEmail(email: string, name: string): Promise<void> {
    const subject = "Welcome Back! Your NoBullFit Pro Is Active Again";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Welcome Back! 🎉</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        Great news! Your NoBullFit Pro subscription has been resumed and all Pro features are now available again.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <p style="color: #166534; margin: 0; font-weight: 600;">Your Pro access is now active!</p>
                        <p style="color: #166534; margin: 8px 0 0 0; font-size: 14px;">All your saved data and preferences have been preserved.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Go to Dashboard</a>
                    </div>
                    
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
Welcome Back! Your NoBullFit Pro Is Active Again

Hi ${name},

Great news! Your NoBullFit Pro subscription has been resumed and all Pro features are now available again.

Your Pro access is now active! All your saved data and preferences have been preserved.

Go to your dashboard: ${APP_URL}/dashboard

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send payment failed email
export async function sendPaymentFailedEmail(email: string, name: string): Promise<void> {
    const subject = "Action Required: Payment Failed for NoBullFit Pro";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Payment Failed</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        We were unable to process your payment for NoBullFit Pro. This could be due to an expired card, insufficient funds, or other payment issues.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 16px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
                        <p style="color: #991b1b; margin: 0; font-size: 14px;">
                            <strong>Action Required:</strong> Please update your payment method to continue enjoying Pro features without interruption.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard/billing" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Update Payment Method</a>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        If you need assistance, please don't hesitate to contact us at <a href="mailto:${FROM_EMAIL}" style="color: #27272a; text-decoration: underline;">${FROM_EMAIL}</a>.
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
Action Required: Payment Failed for NoBullFit Pro

Hi ${name},

We were unable to process your payment for NoBullFit Pro. This could be due to an expired card, insufficient funds, or other payment issues.

Action Required: Please update your payment method to continue enjoying Pro features without interruption.

Update your payment method at: ${APP_URL}/dashboard/billing

If you need assistance, please contact us at ${FROM_EMAIL}.

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send scheduled cancellation email (when user schedules cancellation at end of billing cycle)
export async function sendSubscriptionScheduledCancellationEmail(email: string, name: string, endDate: string): Promise<void> {
    const subject = "Your NoBullFit Pro Cancellation Is Scheduled";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Cancellation Scheduled</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        We've received your request to cancel your NoBullFit Pro subscription.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                        <p style="color: #0c4a6e; margin: 0; font-weight: 600;">Your Pro access will remain active until:</p>
                        <p style="color: #0c4a6e; margin: 8px 0 0 0; font-size: 18px; font-weight: 600;">${endDate}</p>
                    </div>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        You'll continue to have full access to all Pro features until this date. After that, your account will automatically switch to the free plan.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 16px; background-color: #fefce8; border-left: 4px solid #eab308; border-radius: 4px;">
                        <p style="color: #854d0e; margin: 0; font-size: 14px;">
                            <strong>Changed your mind?</strong> You can cancel the scheduled cancellation anytime before ${endDate} from your Billing page.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard/billing" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Manage Subscription</a>
                    </div>
                    
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
Your NoBullFit Pro Cancellation Is Scheduled

Hi ${name},

We've received your request to cancel your NoBullFit Pro subscription.

Your Pro access will remain active until: ${endDate}

You'll continue to have full access to all Pro features until this date. After that, your account will automatically switch to the free plan.

Changed your mind? You can cancel the scheduled cancellation anytime before ${endDate} from your Billing page at ${APP_URL}/dashboard/billing

Best regards,
The NoBullFit Team

---
This email was sent to ${email}.
© ${new Date().getFullYear()} NoBullFit. All rights reserved.
    `;

    await sendEmail(email, subject, htmlBody, textBody);
}

// Send cancellation removed email (when user removes scheduled cancellation)
export async function sendSubscriptionCancellationRemovedEmail(email: string, name: string): Promise<void> {
    const subject = "Your NoBullFit Pro Subscription Will Continue";
    
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
                    <h2 style="color: #18181b; margin-top: 0; font-size: 20px; font-weight: 600;">Great News! Your Subscription Will Continue</h2>
                    
                    <p style="color: #18181b; margin: 16px 0;">Hi ${name},</p>
                    
                    <p style="color: #18181b; margin: 16px 0;">
                        We're happy to confirm that your scheduled cancellation has been removed. Your NoBullFit Pro subscription will continue as normal.
                    </p>
                    
                    <div style="margin: 24px 0; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                        <p style="color: #166534; margin: 0; font-weight: 600;">Your Pro subscription is active!</p>
                        <p style="color: #166534; margin: 8px 0 0 0; font-size: 14px;">You'll continue to enjoy all Pro features and your subscription will renew automatically.</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #27272a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">Go to Dashboard</a>
                    </div>
                    
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
Great News! Your NoBullFit Pro Subscription Will Continue

Hi ${name},

We're happy to confirm that your scheduled cancellation has been removed. Your NoBullFit Pro subscription will continue as normal.

Your Pro subscription is active! You'll continue to enjoy all Pro features and your subscription will renew automatically.

Go to your dashboard: ${APP_URL}/dashboard

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