import type { Request, Response } from "express";
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

        // Validate password length
        if (password.length < 8) {
            res.status(400).json({
                error: "Password must be at least 8 characters long."
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

        // First check if token exists at all (even if expired)
        const tokenCheckResult = await pool.query(
            "SELECT token, expires_at, user_id FROM password_resets WHERE token = $1",
            [token]
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
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update user password
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [passwordHash, reset.user_id]
        );

        // Delete used reset token
        await pool.query(
            "DELETE FROM password_resets WHERE token = $1",
            [token]
        );

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
