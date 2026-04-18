import type { Request, Response } from "express";
import crypto from "crypto";
import getPool from "../../db/connection.js";
import bcrypt from "bcryptjs";

// Reset password handler - verifies token and updates password
export async function handleResetPassword(req: Request, res: Response): Promise<void> {
    try {
        const { token, password } = req.body;

        // Basic validation
        if (!token || !password) {
            res.status(400).json({
                error: "Token and password are required."
            });
            return;
        }

        // Validate password length (minimum 8, maximum 72 characters for bcrypt safety)
        if (password.length < 8 || password.length > 72) {
            res.status(400).json({
                error: "Password must be between 8 and 72 characters long."
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

        // Hash the incoming token to compare against stored hash
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        // First check if token exists at all (even if expired)
        const tokenCheckResult = await pool.query(
            "SELECT token, expires_at, user_id FROM password_resets WHERE token = $1",
            [tokenHash]
        );

        if (tokenCheckResult.rows.length === 0) {
            console.error("Token not found in database");
            res.status(400).json({
                error: "Invalid or expired reset token. Please request a new password reset."
            });
            return;
        }

        const tokenData = tokenCheckResult.rows[0];

        // Check expiration manually (more reliable than database NOW())
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        
        if (expiresAt <= now) {
            console.error("Token expired - Expires:", expiresAt.toISOString(), "Now:", now.toISOString());
            res.status(400).json({
                error: "Invalid or expired reset token. Please request a new password reset."
            });
            return;
        }

        // Get user data
        const userResult = await pool.query(
            "SELECT id, email, full_name FROM users WHERE id = $1",
            [tokenData.user_id]
        );

        if (userResult.rows.length === 0) {
            console.error("User not found for token");
            res.status(400).json({
                error: "Invalid reset token. Please request a new password reset."
            });
            return;
        }

        const reset = {
            user_id: tokenData.user_id,
            email: userResult.rows[0].email
        };

        // Hash new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Run the password update, reset-token cleanup, and email-change cleanup
        // in a single transaction so a partial failure can't leave the user with
        // a new password but still-valid reset/email-change tokens.
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                "UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [passwordHash, reset.user_id]
            );
            await client.query(
                "DELETE FROM password_resets WHERE user_id = $1",
                [reset.user_id]
            );
            await client.query(
                "DELETE FROM email_change_requests WHERE user_id = $1",
                [reset.user_id]
            );
            await client.query("COMMIT");
        } catch (txError) {
            await client.query("ROLLBACK");
            throw txError;
        } finally {
            client.release();
        }

        res.status(200).json({
            success: true,
            message: "Password has been reset successfully."
        });

    } catch (error) {
        console.error("Reset password error:", error);
        
        // Don't expose database errors to users
        res.status(500).json({
            error: "An error occurred while resetting your password. Please try again later."
        });
    }
}
