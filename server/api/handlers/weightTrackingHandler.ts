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

// Get weight for a specific date
export async function handleGetWeight(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { date } = req.query;

        if (!date || typeof date !== "string") {
            res.status(400).json({ error: "Date parameter is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Query weight for the specified date
        const result = await pool.query(
            `SELECT id, weight, unit, date, timezone, created_at, updated_at
             FROM weight_tracking 
             WHERE user_id = $1 AND date = $2`,
            [userId, date]
        );

        if (result.rows.length > 0) {
            res.status(200).json({
                weight: {
                    ...result.rows[0],
                    weight: parseFloat(String(result.rows[0].weight))
                }
            });
        } else {
            res.status(200).json({ weight: null });
        }
    } catch (error) {
        console.error("Error fetching weight:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get last unit preference (from most recent weight entry)
export async function handleGetLastWeightUnit(req: Request, res: Response): Promise<void> {
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

        // Get the most recent weight entry's unit
        const result = await pool.query(
            `SELECT unit FROM weight_tracking 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [userId]
        );

        const unit = result.rows.length > 0 ? result.rows[0].unit : "kg";

        res.status(200).json({ unit });
    } catch (error) {
        console.error("Error fetching last weight unit:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Log or update weight
export async function handleLogWeight(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { weight, unit, date, timezone } = req.body;

        // Validation
        if (!weight || !unit || !date || !timezone) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        if (unit !== "kg" && unit !== "lbs") {
            res.status(400).json({ error: "Unit must be 'kg' or 'lbs'" });
            return;
        }

        const weightValue = parseFloat(String(weight));
        if (isNaN(weightValue) || weightValue <= 0) {
            res.status(400).json({ error: "Weight must be a positive number" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Insert or update weight (using ON CONFLICT to handle duplicates)
        const result = await pool.query(
            `INSERT INTO weight_tracking (user_id, weight, unit, date, timezone)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, date) DO UPDATE
             SET weight = EXCLUDED.weight,
                 unit = EXCLUDED.unit,
                 timezone = EXCLUDED.timezone,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING id, weight, unit, date, timezone, created_at, updated_at`,
            [userId, weightValue, unit, date, timezone]
        );

        res.status(200).json({
            weight: {
                ...result.rows[0],
                weight: parseFloat(String(result.rows[0].weight))
            }
        });
    } catch (error) {
        console.error("Error logging weight:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Delete weight entry
export async function handleDeleteWeight(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: "Weight ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Delete weight entry
        const result = await pool.query(
            `DELETE FROM weight_tracking 
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Weight entry not found" });
            return;
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting weight:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
