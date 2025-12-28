import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../utils/emailService.js";

// Rate limiting constants
const MAX_ATTEMPTS_PER_HOUR = 3; // Maximum 3 password reset requests per hour
const MAX_ATTEMPTS_PER_DAY = 5; // Maximum 5 password reset requests per day
const RATE_LIMIT_WINDOW_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_WINDOW_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Check rate limiting for password reset requests
async function checkRateLimit(pool: Awaited<ReturnType<typeof getPool>>, email: string): Promise<{ allowed: boolean; message?: string }> {
    if (!pool) {
        return { allowed: false, message: "Database connection not available." };
    }

    try {
        // First, check existing rate limit record
        const existingResult = await pool.query(
            `SELECT attempt_count, first_attempt_at, last_attempt_at 
             FROM password_reset_attempts 
             WHERE email = $1`,
            [email]
        );

        const now = new Date();

        if (existingResult.rows.length > 0) {
            const rateLimit = existingResult.rows[0];
            const lastAttempt = new Date(rateLimit.last_attempt_at);
            const firstAttempt = new Date(rateLimit.first_attempt_at);
            const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
            const timeSinceFirstAttempt = now.getTime() - firstAttempt.getTime();

            // Reset counters if enough time has passed
            if (timeSinceLastAttempt >= RATE_LIMIT_WINDOW_HOUR) {
                // Reset hourly counter
                await pool.query(
                    `UPDATE password_reset_attempts 
                     SET attempt_count = 1, first_attempt_at = CURRENT_TIMESTAMP, last_attempt_at = CURRENT_TIMESTAMP
                     WHERE email = $1`,
                    [email]
                );
            } else {
                // Check hourly limit before incrementing
                if (rateLimit.attempt_count >= MAX_ATTEMPTS_PER_HOUR) {
                    const minutesRemaining = Math.ceil((RATE_LIMIT_WINDOW_HOUR - timeSinceLastAttempt) / (60 * 1000));
                    return {
                        allowed: false,
                        message: `Too many password reset requests. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""}.`
                    };
                }

                // Check daily limit
                if (timeSinceFirstAttempt < RATE_LIMIT_WINDOW_DAY && rateLimit.attempt_count >= MAX_ATTEMPTS_PER_DAY) {
                    const hoursRemaining = Math.ceil((RATE_LIMIT_WINDOW_DAY - timeSinceFirstAttempt) / (60 * 60 * 1000));
                    return {
                        allowed: false,
                        message: `Daily password reset limit exceeded. Please try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}.`
                    };
                }

                // Increment attempt count
                await pool.query(
                    `UPDATE password_reset_attempts 
                     SET attempt_count = attempt_count + 1, last_attempt_at = CURRENT_TIMESTAMP
                     WHERE email = $1`,
                    [email]
                );
            }
        } else {
            // Create new rate limit record
            await pool.query(
                `INSERT INTO password_reset_attempts (email, attempt_count, first_attempt_at, last_attempt_at)
                 VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [email]
            );
        }

        return { allowed: true };
    } catch (error) {
        console.error("Rate limit check error:", error);
        // If rate limiting check fails, allow the request but log the error
        return { allowed: true };
    }
}

// Forgot password handler - generates reset token and logs it to console
export async function handleForgotPassword(req: Request, res: Response): Promise<void> {
    try {
        const { email } = req.body;

        // Basic validation
        if (!email) {
            res.status(400).json({
                error: "Email is required."
            });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                error: "Please enter a valid email address."
            });
            return;
        }

        // Get database connection
        const pool = await getPool();
        if (!pool) {
            console.error("Database pool not available");
            res.status(500).json({
                error: "Database connection not available. Please try again later."
            });
            return;
        }

        // Check if user exists
        const userResult = await pool.query(
            "SELECT id, email, full_name FROM users WHERE email = $1",
            [email]
        );

        // Always return success to prevent email enumeration
        // But only generate token if user exists
        if (userResult.rows.length === 0) {
            // User doesn't exist, but return success anyway for security
            res.status(200).json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent."
            });
            return;
        }

        const user = userResult.rows[0];

        // Check rate limiting
        const rateLimitCheck = await checkRateLimit(pool, email);

        if (!rateLimitCheck.allowed) {
            // Return success message even if rate limited (don't expose rate limiting)
            // But log it for monitoring
            console.warn(`Password reset rate limit exceeded for ${email}`);
            res.status(200).json({
                success: true,
                message: "If an account with that email exists, a password reset link has been sent."
            });
            return;
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

        // Store reset token in database
        await pool.query(
            `INSERT INTO password_resets (user_id, token, expires_at)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET
                 token = EXCLUDED.token,
                 expires_at = EXCLUDED.expires_at,
                 created_at = CURRENT_TIMESTAMP`,
            [user.id, resetToken, expiresAt]
        );

        // Send password reset email (don't wait for it to complete)
        sendPasswordResetEmail(user.email, user.full_name, resetToken).catch((error) => {
            console.error("Failed to send password reset email:", error);
            // Log the reset link as fallback if email fails (for development/debugging)
            if (process.env.NODE_ENV !== "production") {
                const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
                console.log("Password reset link (fallback):", resetLink);
            }
        });

        // Return success (don't expose whether user exists)
        res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        
        // Don't expose database errors to users
        res.status(500).json({
            error: "An error occurred while processing your request. Please try again later."
        });
    }
}
