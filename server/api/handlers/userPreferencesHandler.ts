import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

// Valid quick_add_days options
const VALID_QUICK_ADD_DAYS = [30, 60, 90, 120, 0]; // 0 = All Time

// Valid weight_goal options
const VALID_WEIGHT_GOALS = ["lose", "maintain", "gain"];

// Valid weight unit options
const VALID_WEIGHT_UNITS = ["kg", "lbs"];

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

// Helper to check if user is a Pro subscriber
async function isProUser(userId: number): Promise<boolean> {
    const pool = await getPool();
    if (!pool) return false;

    const result = await pool.query(
        "SELECT subscribed FROM users WHERE id = $1",
        [userId]
    );

    return result.rows[0]?.subscribed === true;
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
            "SELECT quick_add_days, weight_goal, target_weight, target_weight_unit, communication_email, communication_sms, communication_push FROM user_settings WHERE user_id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            res.status(200).json({
                quick_add_days: 30,
                weight_goal: null,
                target_weight: null,
                target_weight_unit: null,
                communication_email: true,
                communication_sms: false,
                communication_push: false
            });
            return;
        }

        res.status(200).json({
            quick_add_days: result.rows[0].quick_add_days,
            weight_goal: result.rows[0].weight_goal,
            target_weight: result.rows[0].target_weight ? parseFloat(result.rows[0].target_weight) : null,
            target_weight_unit: result.rows[0].target_weight_unit,
            communication_email: result.rows[0].communication_email ?? true,
            communication_sms: result.rows[0].communication_sms ?? false,
            communication_push: result.rows[0].communication_push ?? false
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

        const { quick_add_days, weight_goal, target_weight, target_weight_unit, communication_email, communication_sms, communication_push } = req.body;

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

        // Validate weight_goal if provided (Pro feature)
        if (weight_goal !== undefined && weight_goal !== null) {
            // Check if user is Pro
            const isPro = await isProUser(userId);
            if (!isPro) {
                res.status(403).json({ error: "Weight goal is a Pro feature" });
                return;
            }

            if (!VALID_WEIGHT_GOALS.includes(weight_goal)) {
                res.status(400).json({ 
                    error: "Invalid weight_goal value. Must be 'lose', 'maintain', or 'gain'." 
                });
                return;
            }
        }

        // Validate target_weight if provided (Pro feature)
        if (target_weight !== undefined && target_weight !== null) {
            // Check if user is Pro
            const isPro = await isProUser(userId);
            if (!isPro) {
                res.status(403).json({ error: "Target weight is a Pro feature" });
                return;
            }

            const weight = parseFloat(target_weight);
            if (isNaN(weight) || weight <= 0 || weight > 1000) {
                res.status(400).json({ 
                    error: "Invalid target_weight value. Must be a positive number." 
                });
                return;
            }
        }

        // Validate target_weight_unit if provided
        if (target_weight_unit !== undefined && target_weight_unit !== null) {
            if (!VALID_WEIGHT_UNITS.includes(target_weight_unit)) {
                res.status(400).json({ 
                    error: "Invalid target_weight_unit value. Must be 'kg' or 'lbs'." 
                });
                return;
            }
        }

        // Validate communication preferences if provided
        if (communication_email !== undefined && typeof communication_email !== "boolean") {
            res.status(400).json({ error: "Invalid communication_email value. Must be a boolean." });
            return;
        }
        if (communication_sms !== undefined && typeof communication_sms !== "boolean") {
            res.status(400).json({ error: "Invalid communication_sms value. Must be a boolean." });
            return;
        }
        if (communication_push !== undefined && typeof communication_push !== "boolean") {
            res.status(400).json({ error: "Invalid communication_push value. Must be a boolean." });
            return;
        }

        // Upsert user settings
        const result = await pool.query(
            `INSERT INTO user_settings (user_id, quick_add_days, weight_goal, target_weight, target_weight_unit, communication_email, communication_sms, communication_push, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id)
             DO UPDATE SET 
                 quick_add_days = COALESCE($2, user_settings.quick_add_days),
                 weight_goal = $3,
                 target_weight = $4,
                 target_weight_unit = $5,
                 communication_email = COALESCE($6, user_settings.communication_email),
                 communication_sms = COALESCE($7, user_settings.communication_sms),
                 communication_push = COALESCE($8, user_settings.communication_push),
                 updated_at = CURRENT_TIMESTAMP
             RETURNING quick_add_days, weight_goal, target_weight, target_weight_unit, communication_email, communication_sms, communication_push`,
            [
                userId, 
                quick_add_days ?? 30, 
                weight_goal === undefined ? null : weight_goal,
                target_weight === undefined ? null : target_weight,
                target_weight_unit === undefined ? null : target_weight_unit,
                communication_email === undefined ? true : communication_email,
                communication_sms === undefined ? false : communication_sms,
                communication_push === undefined ? false : communication_push
            ]
        );

        res.status(200).json({
            message: "Preferences updated successfully",
            quick_add_days: result.rows[0].quick_add_days,
            weight_goal: result.rows[0].weight_goal,
            target_weight: result.rows[0].target_weight ? parseFloat(result.rows[0].target_weight) : null,
            target_weight_unit: result.rows[0].target_weight_unit,
            communication_email: result.rows[0].communication_email,
            communication_sms: result.rows[0].communication_sms,
            communication_push: result.rows[0].communication_push
        });
    } catch (error) {
        console.error("Error updating user preferences:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
