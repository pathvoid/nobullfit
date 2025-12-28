import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";
import { sendAccountDeletionConfirmationEmail } from "../utils/emailService.js";

export async function handleDeleteAccount(req: Request, res: Response) {
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
        const { password } = req.body;

        // Validate input
        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Password is required to confirm account deletion." });
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

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Incorrect password. Account deletion cancelled." });
        }

        // Send confirmation email before deletion
        try {
            await sendAccountDeletionConfirmationEmail(user.email, user.full_name);
        } catch (emailError) {
            // Log error but don't fail the deletion
            console.error("Failed to send account deletion confirmation email:", emailError);
        }

        // Delete user account (CASCADE will handle related data: favorites, grocery_lists, recipes, etc.)
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);

        return res.status(200).json({
            message: "Your account has been successfully deleted."
        });
    } catch (error) {
        console.error("Error deleting account:", error);
        return res.status(500).json({ error: "An error occurred. Please try again later." });
    }
}

