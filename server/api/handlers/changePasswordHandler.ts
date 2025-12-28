import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";
import { sendPasswordChangeNotificationEmail } from "../utils/emailService.js";

export async function handleChangePassword(req: Request, res: Response) {
    try {
        const pool = await getPool();
        if (!pool) {
            return res.status(503).json({ error: "Database connection not available. Please try again later." });
        }

        // Verify authentication
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace("Bearer ", "") || req.cookies?.auth_token;

        if (!token) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const decoded = verifyToken(token);
        if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
            return res.status(401).json({ error: "Invalid or expired token." });
        }

        const userId = decoded.userId as number;
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || typeof currentPassword !== "string") {
            return res.status(400).json({ error: "Current password is required." });
        }

        if (!newPassword || typeof newPassword !== "string") {
            return res.status(400).json({ error: "New password is required." });
        }

        // Validate new password length
        if (newPassword.length < 8) {
            return res.status(400).json({ error: "New password must be at least 8 characters long." });
        }

        // Get current user with password hash
        const userResult = await pool.query(
            "SELECT id, email, full_name, password_hash FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Current password is incorrect." });
        }

        // Check if new password is the same as current password
        const samePassword = await bcrypt.compare(newPassword, user.password_hash);
        if (samePassword) {
            return res.status(400).json({ error: "New password must be different from your current password." });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [passwordHash, userId]
        );

        // Send notification email
        try {
            await sendPasswordChangeNotificationEmail(user.email, user.full_name);
        } catch (emailError) {
            // Log error but don't fail the request
            console.error("Failed to send password change notification email:", emailError);
        }

        return res.status(200).json({
            message: "Password has been changed successfully."
        });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ error: "An error occurred. Please try again later." });
    }
}
