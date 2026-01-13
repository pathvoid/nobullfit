import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { calculateNutrientsForFood, convertEdamamNutrientsToOurFormat } from "../utils/edamamNutrients.js";

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

// Get logged foods for a specific date
export async function handleGetFoodTracking(req: Request, res: Response): Promise<void> {
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

        // Query foods for the specified date
        const result = await pool.query(
            `SELECT id, item_type, food_id, food_label, food_data, recipe_data, quantity, 
                    measure_uri, measure_label, category, date, timezone, nutrients, 
                    created_at, updated_at
             FROM food_tracking 
             WHERE user_id = $1 AND date = $2 
             ORDER BY category, created_at ASC`,
            [userId, date]
        );

        res.status(200).json({
            foods: result.rows
        });
    } catch (error) {
        console.error("Error fetching food tracking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Log a food item
export async function handleLogFood(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const {
            itemType,
            foodId,
            foodLabel,
            foodData,
            recipeData,
            quantity,
            measureUri,
            measureLabel,
            category,
            date,
            timezone,
            nutrients: providedNutrients
        } = req.body;

        // Validation
        if (!foodId || !foodLabel || !foodData || !quantity || !category || !date || !timezone) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }

        if (itemType === "recipe" && !recipeData) {
            res.status(400).json({ error: "Recipe data is required for recipe items" });
            return;
        }

        // Calculate nutrients if not provided (for food items)
        let nutrients = providedNutrients;
        if (!nutrients && itemType === "food" && measureUri) {
            const edamamResponse = await calculateNutrientsForFood(foodId, quantity, measureUri);
            if (edamamResponse) {
                nutrients = convertEdamamNutrientsToOurFormat(edamamResponse);
            } else {
                // Fallback: calculate from base nutrients if available
                const foodDataObj = typeof foodData === "string" ? JSON.parse(foodData) : foodData;
                if (foodDataObj.nutrients) {
                    // Find the measure weight
                    const measure = foodDataObj.measures?.find((m: { uri: string }) => m.uri === measureUri);
                    const measureWeight = measure?.weight || 100;
                    const multiplier = (quantity * measureWeight) / 100;
                    
                    nutrients = {};
                    Object.keys(foodDataObj.nutrients).forEach((key) => {
                        if (foodDataObj.nutrients[key] !== undefined) {
                            nutrients[key] = foodDataObj.nutrients[key] * multiplier;
                        }
                    });
                } else {
                    res.status(400).json({ error: "Unable to calculate nutrients" });
                    return;
                }
            }
        }

        // For recipes, nutrients should be provided, but if not, use empty object
        if (!nutrients && itemType === "recipe") {
            nutrients = {};
        }

        if (!nutrients) {
            res.status(400).json({ error: "Nutrients are required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Insert the logged food
        const result = await pool.query(
            `INSERT INTO food_tracking 
             (user_id, item_type, food_id, food_label, food_data, recipe_data, quantity, 
              measure_uri, measure_label, category, date, timezone, nutrients)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id, item_type, food_id, food_label, food_data, recipe_data, quantity, 
                       measure_uri, measure_label, category, date, timezone, nutrients, 
                       created_at, updated_at`,
            [
                userId,
                itemType || "food",
                foodId,
                foodLabel,
                JSON.stringify(foodData),
                recipeData ? JSON.stringify(recipeData) : null,
                quantity,
                measureUri || null,
                measureLabel || null,
                category,
                date,
                timezone,
                JSON.stringify(nutrients)
            ]
        );

        res.status(201).json({
            food: result.rows[0]
        });
    } catch (error) {
        console.error("Error logging food:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update a logged food item
export async function handleUpdateFoodTracking(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { id } = req.params;
        const {
            quantity,
            measureUri,
            measureLabel,
            category,
            nutrients
        } = req.body;

        if (!id || typeof id !== "string") {
            res.status(400).json({ error: "Food tracking ID is required" });
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

        if (quantity !== undefined) {
            updates.push(`quantity = $${paramIndex++}`);
            values.push(quantity);
        }
        if (measureUri !== undefined) {
            updates.push(`measure_uri = $${paramIndex++}`);
            values.push(measureUri);
        }
        if (measureLabel !== undefined) {
            updates.push(`measure_label = $${paramIndex++}`);
            values.push(measureLabel);
        }
        if (category !== undefined) {
            updates.push(`category = $${paramIndex++}`);
            values.push(category);
        }
        if (nutrients !== undefined) {
            updates.push(`nutrients = $${paramIndex++}`);
            values.push(JSON.stringify(nutrients));
        }

        if (updates.length === 0) {
            res.status(400).json({ error: "No fields to update" });
            return;
        }

        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(parseInt(id), userId);

        const query = `
            UPDATE food_tracking 
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
            RETURNING id, item_type, food_id, food_label, food_data, recipe_data, quantity, 
                      measure_uri, measure_label, category, date, timezone, nutrients, 
                      created_at, updated_at
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Food tracking entry not found" });
            return;
        }

        res.status(200).json({
            food: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating food tracking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Delete a logged food item
export async function handleDeleteFoodTracking(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { id } = req.params;

        if (!id) {
            res.status(400).json({ error: "Food tracking ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            "DELETE FROM food_tracking WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Food tracking entry not found" });
            return;
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error deleting food tracking:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Helper function to check if user is subscribed (pro user)
async function isUserSubscribed(userId: number): Promise<boolean> {
    const pool = await getPool();
    if (!pool) return false;
    
    const result = await pool.query(
        "SELECT subscribed FROM users WHERE id = $1",
        [userId]
    );
    
    return result.rows.length > 0 && result.rows[0].subscribed === true;
}

// Copy meals from one day to another (Pro feature)
export async function handleCopyDay(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Check if user is subscribed
        const subscribed = await isUserSubscribed(userId);
        if (!subscribed) {
            res.status(403).json({ error: "This feature requires a Pro subscription" });
            return;
        }

        const { sourceDate, targetDate, timezone } = req.body;

        if (!sourceDate || !targetDate || !timezone) {
            res.status(400).json({ error: "sourceDate, targetDate, and timezone are required" });
            return;
        }

        if (sourceDate === targetDate) {
            res.status(400).json({ error: "Source and target dates cannot be the same" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get all foods from source date
        const sourceFoods = await pool.query(
            `SELECT item_type, food_id, food_label, food_data, recipe_data, quantity, 
                    measure_uri, measure_label, category, nutrients
             FROM food_tracking 
             WHERE user_id = $1 AND date = $2`,
            [userId, sourceDate]
        );

        if (sourceFoods.rows.length === 0) {
            res.status(400).json({ error: "No foods found on source date" });
            return;
        }

        // Insert copied foods to target date
        const insertPromises = sourceFoods.rows.map(food => {
            return pool.query(
                `INSERT INTO food_tracking 
                 (user_id, item_type, food_id, food_label, food_data, recipe_data, quantity, 
                  measure_uri, measure_label, category, date, timezone, nutrients)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING id`,
                [
                    userId,
                    food.item_type,
                    food.food_id,
                    food.food_label,
                    JSON.stringify(food.food_data),
                    food.recipe_data ? JSON.stringify(food.recipe_data) : null,
                    food.quantity,
                    food.measure_uri,
                    food.measure_label,
                    food.category,
                    targetDate,
                    timezone,
                    JSON.stringify(food.nutrients)
                ]
            );
        });

        await Promise.all(insertPromises);

        res.status(200).json({
            success: true,
            copiedCount: sourceFoods.rows.length,
            message: `Successfully copied ${sourceFoods.rows.length} food(s) from ${sourceDate} to ${targetDate}`
        });
    } catch (error) {
        console.error("Error copying day:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Copy meals from one week to another (Pro feature)
export async function handleCopyWeek(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Check if user is subscribed
        const subscribed = await isUserSubscribed(userId);
        if (!subscribed) {
            res.status(403).json({ error: "This feature requires a Pro subscription" });
            return;
        }

        const { sourceWeekStart, targetWeekStart, timezone } = req.body;

        if (!sourceWeekStart || !targetWeekStart || !timezone) {
            res.status(400).json({ error: "sourceWeekStart, targetWeekStart, and timezone are required" });
            return;
        }

        if (sourceWeekStart === targetWeekStart) {
            res.status(400).json({ error: "Source and target weeks cannot be the same" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Calculate end of source week (7 days)
        const sourceStart = new Date(sourceWeekStart + "T00:00:00");
        const sourceEnd = new Date(sourceStart);
        sourceEnd.setDate(sourceEnd.getDate() + 6);
        const sourceEndStr = sourceEnd.toISOString().split("T")[0];

        // Get all foods from source week
        const sourceFoods = await pool.query(
            `SELECT item_type, food_id, food_label, food_data, recipe_data, quantity, 
                    measure_uri, measure_label, category, date, nutrients
             FROM food_tracking 
             WHERE user_id = $1 AND date >= $2 AND date <= $3
             ORDER BY date, category, created_at`,
            [userId, sourceWeekStart, sourceEndStr]
        );

        if (sourceFoods.rows.length === 0) {
            res.status(400).json({ error: "No foods found in source week" });
            return;
        }

        // Calculate day offset between source and target
        const targetStart = new Date(targetWeekStart + "T00:00:00");
        const dayOffset = Math.round((targetStart.getTime() - sourceStart.getTime()) / (1000 * 60 * 60 * 24));

        // Insert copied foods to target week
        const insertPromises = sourceFoods.rows.map(food => {
            // Calculate target date by adding day offset
            // PostgreSQL returns date as Date object, so handle both cases
            let foodDate: Date;
            if (food.date instanceof Date) {
                foodDate = new Date(food.date);
            } else {
                foodDate = new Date(food.date + "T00:00:00");
            }
            foodDate.setDate(foodDate.getDate() + dayOffset);
            const targetDateStr = foodDate.toISOString().split("T")[0];

            return pool.query(
                `INSERT INTO food_tracking 
                 (user_id, item_type, food_id, food_label, food_data, recipe_data, quantity, 
                  measure_uri, measure_label, category, date, timezone, nutrients)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING id`,
                [
                    userId,
                    food.item_type,
                    food.food_id,
                    food.food_label,
                    JSON.stringify(food.food_data),
                    food.recipe_data ? JSON.stringify(food.recipe_data) : null,
                    food.quantity,
                    food.measure_uri,
                    food.measure_label,
                    food.category,
                    targetDateStr,
                    timezone,
                    JSON.stringify(food.nutrients)
                ]
            );
        });

        await Promise.all(insertPromises);

        res.status(200).json({
            success: true,
            copiedCount: sourceFoods.rows.length,
            message: `Successfully copied ${sourceFoods.rows.length} food(s) from source week to target week`
        });
    } catch (error) {
        console.error("Error copying week:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get recent foods/recipes for quick-add
export async function handleGetRecentFoods(req: Request, res: Response): Promise<void> {
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

        // Get user's quick_add_days preference (default to 30 if not set)
        const settingsResult = await pool.query(
            "SELECT quick_add_days FROM user_settings WHERE user_id = $1",
            [userId]
        );
        const quickAddDays = settingsResult.rows.length > 0 ? settingsResult.rows[0].quick_add_days : 30;

        // Build the date filter condition based on user preference
        // 0 = All Time (no date filter)
        // Inner filter is for the subquery (no alias), outer filter is for the main query (ft alias)
        const innerDateFilter = quickAddDays > 0 
            ? `AND created_at >= CURRENT_TIMESTAMP - INTERVAL '${quickAddDays} days'`
            : "";
        const outerDateFilter = quickAddDays > 0 
            ? `AND ft.created_at >= CURRENT_TIMESTAMP - INTERVAL '${quickAddDays} days'`
            : "";

        // Get unique food items and recipes with their most recent data
        // For manual entries (food_id starts with "manual_"), group by food_label to avoid duplicates
        // For non-manual entries, group by food_id
        const result = await pool.query(
            `SELECT ft.item_type, ft.food_id, ft.food_label, ft.food_data, ft.recipe_data, 
                    ft.measure_uri, ft.measure_label, ft.category, ft.quantity, ft.nutrients
             FROM food_tracking ft
             INNER JOIN (
                 SELECT 
                     item_type,
                     CASE 
                         WHEN food_id LIKE 'manual_%' THEN food_label
                         ELSE food_id
                     END as grouping_key,
                     MAX(created_at) as max_created_at
                 FROM food_tracking
                 WHERE user_id = $1 ${innerDateFilter}
                 GROUP BY item_type, 
                     CASE 
                         WHEN food_id LIKE 'manual_%' THEN food_label
                         ELSE food_id
                     END
             ) latest ON ft.item_type = latest.item_type 
                     AND (
                         (ft.food_id LIKE 'manual_%' AND ft.food_label = latest.grouping_key)
                         OR (ft.food_id NOT LIKE 'manual_%' AND ft.food_id = latest.grouping_key)
                     )
                     AND ft.created_at = latest.max_created_at
             WHERE ft.user_id = $1 ${outerDateFilter}
             ORDER BY ft.created_at DESC
             LIMIT 50`,
            [userId]
        );

        // Parse JSONB fields
        const foods = result.rows.map(row => {
            // PostgreSQL JSONB is already parsed, but handle both cases
            let nutrients = row.nutrients;
            if (nutrients === null || nutrients === undefined) {
                nutrients = {};
            } else if (typeof nutrients === "string") {
                try {
                    nutrients = JSON.parse(nutrients);
                } catch (e) {
                    console.error("Error parsing nutrients:", e);
                    nutrients = {};
                }
            }
            // If nutrients is already an object (from JSONB), use it directly
            
            return {
                ...row,
                food_data: typeof row.food_data === "string" ? JSON.parse(row.food_data) : row.food_data,
                recipe_data: row.recipe_data && typeof row.recipe_data === "string" ? JSON.parse(row.recipe_data) : row.recipe_data,
                nutrients: nutrients || {}
            };
        });

        res.status(200).json({
            foods
        });
    } catch (error) {
        console.error("Error fetching recent foods:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}