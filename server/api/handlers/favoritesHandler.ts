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

// Get user's favorites
export async function handleGetFavorites(req: Request, res: Response): Promise<void> {
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

        const result = await pool.query(
            "SELECT id, food_id, food_label, food_data, item_type, created_at FROM favorites WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        res.status(200).json({
            favorites: result.rows
        });
    } catch (error) {
        console.error("Error fetching favorites:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Add favorite
export async function handleAddFavorite(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { foodId, foodLabel, foodData, itemType } = req.body;

        if (!foodId || !foodLabel) {
            res.status(400).json({ error: "Food ID and label are required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Insert or update favorite (using ON CONFLICT to handle duplicates)
        const result = await pool.query(
            `INSERT INTO favorites (user_id, food_id, food_label, food_data, item_type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, food_id, item_type) DO UPDATE
             SET food_label = EXCLUDED.food_label,
                 food_data = EXCLUDED.food_data,
                 created_at = CURRENT_TIMESTAMP
             RETURNING id, food_id, food_label, food_data, item_type, created_at`,
            [userId, foodId, foodLabel, foodData || null, itemType || "food"]
        );

        res.status(200).json({
            success: true,
            favorite: result.rows[0]
        });
    } catch (error) {
        console.error("Error adding favorite:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Remove favorite
export async function handleRemoveFavorite(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { foodId } = req.params;
        const itemType = req.query.itemType as string || "food";

        if (!foodId) {
            res.status(400).json({ error: "Food ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            "DELETE FROM favorites WHERE user_id = $1 AND food_id = $2 AND item_type = $3 RETURNING id",
            [userId, foodId, itemType]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Favorite not found" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Favorite removed"
        });
    } catch (error) {
        console.error("Error removing favorite:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Check if food is favorited
export async function handleCheckFavorite(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { foodId } = req.params;
        const itemType = req.query.itemType as string || "food";

        if (!foodId) {
            res.status(400).json({ error: "Food ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            "SELECT id FROM favorites WHERE user_id = $1 AND food_id = $2 AND item_type = $3",
            [userId, foodId, itemType]
        );

        res.status(200).json({
            isFavorite: result.rows.length > 0
        });
    } catch (error) {
        console.error("Error checking favorite:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

