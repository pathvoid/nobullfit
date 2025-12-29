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

// Calculate BMR using Mifflin-St Jeor equation
function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
    const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    return gender === "male" ? baseBMR + 5 : baseBMR - 161;
}

// Calculate TDEE from BMR and activity level
function calculateTDEE(bmr: number, activityLevel: string): number {
    const multipliers: Record<string, number> = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extremely_active: 1.9
    };
    return bmr * (multipliers[activityLevel] || 1.2);
}

// Get latest weight for user
export async function handleGetLatestWeight(req: Request, res: Response): Promise<void> {
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

        // Get the most recent weight entry
        const result = await pool.query(
            `SELECT weight, unit FROM weight_tracking 
             WHERE user_id = $1 
             ORDER BY date DESC, created_at DESC 
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length > 0) {
            res.status(200).json({
                weight: {
                    weight: parseFloat(String(result.rows[0].weight)),
                    unit: result.rows[0].unit
                }
            });
        } else {
            res.status(200).json({ weight: null });
        }
    } catch (error) {
        console.error("Error fetching latest weight:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get TDEE data for user
export async function handleGetTDEE(req: Request, res: Response): Promise<void> {
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
            `SELECT id, age, gender, height_cm, activity_level, bmr, tdee, created_at, updated_at
             FROM user_tdee 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length > 0) {
            res.status(200).json({
                tdee: {
                    ...result.rows[0],
                    age: parseInt(String(result.rows[0].age)),
                    height_cm: parseFloat(String(result.rows[0].height_cm)),
                    bmr: parseFloat(String(result.rows[0].bmr)),
                    tdee: parseFloat(String(result.rows[0].tdee))
                }
            });
        } else {
            res.status(200).json({ tdee: null });
        }
    } catch (error) {
        console.error("Error fetching TDEE:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Save or update TDEE data
export async function handleSaveTDEE(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { age, gender, heightCm, activityLevel } = req.body;

        // Validation
        if (!age || !gender || !heightCm || !activityLevel) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        if (gender !== "male" && gender !== "female") {
            res.status(400).json({ error: "Gender must be 'male' or 'female'" });
            return;
        }

        const validActivityLevels = ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"];
        if (!validActivityLevels.includes(activityLevel)) {
            res.status(400).json({ error: "Invalid activity level" });
            return;
        }

        const ageValue = parseInt(String(age));
        if (isNaN(ageValue) || ageValue < 1 || ageValue > 150) {
            res.status(400).json({ error: "Age must be a valid number between 1 and 150" });
            return;
        }

        const heightCmValue = parseFloat(String(heightCm));
        if (isNaN(heightCmValue) || heightCmValue <= 0 || heightCmValue > 300) {
            res.status(400).json({ error: "Height must be a valid positive number (in cm)" });
            return;
        }

        // Get latest weight
        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const weightResult = await pool.query(
            `SELECT weight, unit FROM weight_tracking 
             WHERE user_id = $1 
             ORDER BY date DESC, created_at DESC 
             LIMIT 1`,
            [userId]
        );

        if (weightResult.rows.length === 0) {
            res.status(400).json({ error: "Weight data is required. Please log your weight in Progress Tracking first." });
            return;
        }

        // Convert weight to kg if needed
        let weightKg = parseFloat(String(weightResult.rows[0].weight));
        if (weightResult.rows[0].unit === "lbs") {
            weightKg = weightKg * 0.453592; // Convert lbs to kg
        }

        // Calculate BMR and TDEE
        const bmr = calculateBMR(weightKg, heightCmValue, ageValue, gender);
        const tdee = calculateTDEE(bmr, activityLevel);

        // Insert or update TDEE data
        const result = await pool.query(
            `INSERT INTO user_tdee (user_id, age, gender, height_cm, activity_level, bmr, tdee)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id) DO UPDATE
             SET age = EXCLUDED.age,
                 gender = EXCLUDED.gender,
                 height_cm = EXCLUDED.height_cm,
                 activity_level = EXCLUDED.activity_level,
                 bmr = EXCLUDED.bmr,
                 tdee = EXCLUDED.tdee,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING id, age, gender, height_cm, activity_level, bmr, tdee, created_at, updated_at`,
            [userId, ageValue, gender, heightCmValue, activityLevel, bmr, tdee]
        );

        res.status(200).json({
            tdee: {
                ...result.rows[0],
                age: parseInt(String(result.rows[0].age)),
                height_cm: parseFloat(String(result.rows[0].height_cm)),
                bmr: parseFloat(String(result.rows[0].bmr)),
                tdee: parseFloat(String(result.rows[0].tdee))
            }
        });
    } catch (error) {
        console.error("Error saving TDEE:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

