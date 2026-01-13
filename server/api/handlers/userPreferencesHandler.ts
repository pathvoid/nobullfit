import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

// Valid quick_add_days options
const VALID_QUICK_ADD_DAYS = [30, 60, 90, 120, 0]; // 0 = All Time

// Helper to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.cookies?.auth_token;

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
        return null;
    }

    return decoded.userId as number;
}

// Get user preferences
export async function handleGetUserPreferences(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user settings, or return defaults if not set
        const result = await pool.query(
            "SELECT quick_add_days FROM user_settings WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            res.status(200).json({
                quick_add_days: 30
            });
            return;
        }

        res.status(200).json({
            quick_add_days: result.rows[0].quick_add_days
        });
    } catch (error) {
        console.error("Error fetching user preferences:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update user preferences
export async function handleUpdateUserPreferences(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const { quick_add_days } = req.body;

        // Validate quick_add_days if provided
        if (quick_add_days !== undefined) {
            const days = parseInt(quick_add_days, 10);
            if (isNaN(days) || !VALID_QUICK_ADD_DAYS.includes(days)) {
                res.status(400).json({ 
                    error: "Invalid quick_add_days value. Must be 30, 60, 90, 120, or 0 (All Time)." 
                });
                return;
            }
        }

        // Upsert user settings
        const result = await pool.query(
            `INSERT INTO user_settings (user_id, quick_add_days, updated_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id)
             DO UPDATE SET 
                 quick_add_days = COALESCE($2, user_settings.quick_add_days),
                 updated_at = CURRENT_TIMESTAMP
             RETURNING quick_add_days`,
            [userId, quick_add_days ?? 30]
        );

        res.status(200).json({
            message: "Preferences updated successfully",
            quick_add_days: result.rows[0].quick_add_days
        });
    } catch (error) {
        console.error("Error updating user preferences:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
