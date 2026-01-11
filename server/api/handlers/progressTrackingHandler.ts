import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

// Helper function to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
        if (cookieToken) {
            token = cookieToken;
        }
    }

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    return decoded ? decoded.userId : null;
}

// Get logged activities for a specific date
export async function handleGetProgressTracking(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { date, timezone } = req.query;

        if (!date || typeof date !== "string") {
            res.status(400).json({ error: "Date parameter is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Query activities for the specified date
        const result = await pool.query(
            `SELECT id, activity_type, activity_name, date, timezone, activity_data, 
                    calories_burned, created_at, updated_at
             FROM progress_tracking 
             WHERE user_id = $1 AND date = $2 
             ORDER BY created_at ASC`,
            [userId, date]
        );

        // Parse JSONB fields and ensure calories_burned is a number
        const activities = result.rows.map(row => ({
            ...row,
            activity_data: typeof row.activity_data === "string" ? JSON.parse(row.activity_data) : row.activity_data,
            calories_burned: row.calories_burned !== null && row.calories_burned !== undefined 
                ? parseFloat(String(row.calories_burned)) 
                : null
        }));

        res.status(200).json({
            activities
        });
    } catch (error) {
        console.error("Error fetching progress tracking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get unique activity names for quick-add (recent activities)
export async function handleGetRecentActivities(req: Request, res: Response): Promise<void> {
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

        // Get unique activity names with their types and most recent data
        const result = await pool.query(
            `SELECT DISTINCT ON (activity_type, activity_name) 
                    activity_type, activity_name, activity_data, calories_burned
             FROM progress_tracking 
             WHERE user_id = $1 
             ORDER BY activity_type, activity_name, created_at DESC
             LIMIT 50`,
            [userId]
        );

        // Parse JSONB fields and ensure calories_burned is a number
        const activities = result.rows.map(row => ({
            ...row,
            activity_data: typeof row.activity_data === "string" ? JSON.parse(row.activity_data) : row.activity_data,
            calories_burned: row.calories_burned !== null && row.calories_burned !== undefined 
                ? parseFloat(String(row.calories_burned)) 
                : null
        }));

        res.status(200).json({
            activities
        });
    } catch (error) {
        console.error("Error fetching recent activities:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Log an activity
export async function handleLogActivity(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const {
            activityType,
            activityName,
            date,
            timezone,
            activityData,
            caloriesBurned
        } = req.body;

        // Validation
        if (!activityType || !activityName || !date || !timezone || !activityData) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Insert the logged activity
        const result = await pool.query(
            `INSERT INTO progress_tracking 
             (user_id, activity_type, activity_name, date, timezone, activity_data, calories_burned)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, activity_type, activity_name, date, timezone, activity_data, 
                       calories_burned, created_at, updated_at`,
            [
                userId,
                activityType,
                activityName,
                date,
                timezone,
                JSON.stringify(activityData),
                caloriesBurned || null
            ]
        );

        res.status(201).json({
            activity: result.rows[0]
        });
    } catch (error) {
        console.error("Error logging activity:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update a logged activity
export async function handleUpdateProgressTracking(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const {
            activityName,
            activityData,
            caloriesBurned
        } = req.body;

        if (!id || typeof id !== "string") {
            res.status(400).json({ error: "Activity tracking ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Build update query dynamically based on provided fields
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (activityName !== undefined) {
            updates.push(`activity_name = $${paramIndex++}`);
            values.push(activityName);
        }
        if (activityData !== undefined) {
            updates.push(`activity_data = $${paramIndex++}`);
            values.push(JSON.stringify(activityData));
        }
        if (caloriesBurned !== undefined) {
            updates.push(`calories_burned = $${paramIndex++}`);
            values.push(caloriesBurned);
        }

        if (updates.length === 0) {
            res.status(400).json({ error: "No fields to update" });
            return;
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(parseInt(id), userId);

        const query = `
            UPDATE progress_tracking 
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING id, activity_type, activity_name, date, timezone, activity_data, 
                      calories_burned, created_at, updated_at
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Activity tracking entry not found" });
            return;
        }

        // Parse JSONB fields and ensure calories_burned is a number
        const activity = {
            ...result.rows[0],
            activity_data: typeof result.rows[0].activity_data === "string" ? JSON.parse(result.rows[0].activity_data) : result.rows[0].activity_data,
            calories_burned: result.rows[0].calories_burned !== null && result.rows[0].calories_burned !== undefined 
                ? parseFloat(String(result.rows[0].calories_burned)) 
                : null
        };

        res.status(200).json({
            activity
        });
    } catch (error) {
        console.error("Error updating progress tracking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Delete a logged activity
export async function handleDeleteProgressTracking(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: "Activity tracking ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            "DELETE FROM progress_tracking WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Activity tracking entry not found" });
            return;
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting progress tracking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
