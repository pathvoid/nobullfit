import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";

export async function handleDeleteData(req: Request, res: Response) {
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
        const { password, timePeriod, dataTypes } = req.body;

        // Validate input
        if (!password || typeof password !== "string") {
            return res.status(400).json({ error: "Password is required to confirm data deletion." });
        }

        if (!timePeriod || !["7", "30", "all"].includes(timePeriod)) {
            return res.status(400).json({ error: "Invalid time period. Must be 7, 30, or all." });
        }

        if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
            return res.status(400).json({ error: "At least one data type must be selected." });
        }

        // Get current user with password hash
        const userResult = await pool.query(
            "SELECT id, password_hash FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Incorrect password. Data deletion cancelled." });
        }

        // Calculate date threshold based on time period
        let dateThreshold: Date | null = null;
        if (timePeriod === "7") {
            dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - 7);
        } else if (timePeriod === "30") {
            dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - 30);
        }
        // For "all", dateThreshold remains null

        const deletionResults: Record<string, number> = {};

        // Delete recipes
        if (dataTypes.includes("recipes")) {
            if (dateThreshold) {
                const result = await pool.query(
                    "DELETE FROM recipes WHERE user_id = $1 AND created_at >= $2 RETURNING id",
                    [userId, dateThreshold]
                );
                deletionResults.recipes = result.rowCount || 0;
            } else {
                const result = await pool.query(
                    "DELETE FROM recipes WHERE user_id = $1 RETURNING id",
                    [userId]
                );
                deletionResults.recipes = result.rowCount || 0;
            }
        }

        // Delete favorites
        if (dataTypes.includes("favorites")) {
            if (dateThreshold) {
                const result = await pool.query(
                    "DELETE FROM favorites WHERE user_id = $1 AND created_at >= $2 RETURNING id",
                    [userId, dateThreshold]
                );
                deletionResults.favorites = result.rowCount || 0;
            } else {
                const result = await pool.query(
                    "DELETE FROM favorites WHERE user_id = $1 RETURNING id",
                    [userId]
                );
                deletionResults.favorites = result.rowCount || 0;
            }
        }

        // Delete grocery lists
        if (dataTypes.includes("grocery_lists")) {
            if (dateThreshold) {
                const result = await pool.query(
                    "DELETE FROM grocery_lists WHERE user_id = $1 AND created_at >= $2 RETURNING id",
                    [userId, dateThreshold]
                );
                deletionResults.grocery_lists = result.rowCount || 0;
            } else {
                const result = await pool.query(
                    "DELETE FROM grocery_lists WHERE user_id = $1 RETURNING id",
                    [userId]
                );
                deletionResults.grocery_lists = result.rowCount || 0;
            }
        }

        // Delete food tracking
        if (dataTypes.includes("food_tracking")) {
            if (dateThreshold) {
                const result = await pool.query(
                    "DELETE FROM food_tracking WHERE user_id = $1 AND created_at >= $2 RETURNING id",
                    [userId, dateThreshold]
                );
                deletionResults.food_tracking = result.rowCount || 0;
            } else {
                const result = await pool.query(
                    "DELETE FROM food_tracking WHERE user_id = $1 RETURNING id",
                    [userId]
                );
                deletionResults.food_tracking = result.rowCount || 0;
            }
        }

        // Delete progress tracking
        if (dataTypes.includes("progress_tracking")) {
            if (dateThreshold) {
                const result = await pool.query(
                    "DELETE FROM progress_tracking WHERE user_id = $1 AND created_at >= $2 RETURNING id",
                    [userId, dateThreshold]
                );
                deletionResults.progress_tracking = result.rowCount || 0;
            } else {
                const result = await pool.query(
                    "DELETE FROM progress_tracking WHERE user_id = $1 RETURNING id",
                    [userId]
                );
                deletionResults.progress_tracking = result.rowCount || 0;
            }
        }

        // Delete weight tracking
        if (dataTypes.includes("weight_tracking")) {
            if (dateThreshold) {
                const result = await pool.query(
                    "DELETE FROM weight_tracking WHERE user_id = $1 AND created_at >= $2 RETURNING id",
                    [userId, dateThreshold]
                );
                deletionResults.weight_tracking = result.rowCount || 0;
            } else {
                const result = await pool.query(
                    "DELETE FROM weight_tracking WHERE user_id = $1 RETURNING id",
                    [userId]
                );
                deletionResults.weight_tracking = result.rowCount || 0;
            }
        }

        // Delete TDEE data
        if (dataTypes.includes("tdee")) {
            // TDEE is a single record per user, so we delete it regardless of date threshold
            const result = await pool.query(
                "DELETE FROM user_tdee WHERE user_id = $1 RETURNING id",
                [userId]
            );
            deletionResults.tdee = result.rowCount || 0;
        }

        return res.status(200).json({
            success: true,
            message: "Selected data has been successfully deleted.",
            deleted: deletionResults
        });
    } catch (error) {
        console.error("Error deleting data:", error);
        return res.status(500).json({ error: "An error occurred while deleting data. Please try again later." });
    }
}
