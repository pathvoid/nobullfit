import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

export async function handleExportData(req: Request, res: Response) {
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

        // Get user profile data (excluding password_hash)
        const userResult = await pool.query(
            "SELECT id, email, full_name, country, terms_accepted, terms_accepted_at, plan, plan_selected_at, subscribed, subscribed_at, created_at, updated_at FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Get recipes
        const recipesResult = await pool.query(
            "SELECT id, name, description, ingredients, steps, image_filename, macros, servings, cooking_time_minutes, tags, is_public, is_verified, created_at, updated_at FROM recipes WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        const recipes = recipesResult.rows.map(recipe => ({
            ...recipe,
            ingredients: typeof recipe.ingredients === "string" ? JSON.parse(recipe.ingredients) : recipe.ingredients,
            steps: typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : recipe.steps,
            macros: recipe.macros && typeof recipe.macros === "string" ? JSON.parse(recipe.macros) : recipe.macros,
            tags: recipe.tags && typeof recipe.tags === "string" ? JSON.parse(recipe.tags) : recipe.tags
        }));

        // Get favorites
        const favoritesResult = await pool.query(
            "SELECT id, food_id, food_label, food_data, item_type, created_at FROM favorites WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        const favorites = favoritesResult.rows.map(favorite => ({
            ...favorite,
            food_data: favorite.food_data && typeof favorite.food_data === "string" ? JSON.parse(favorite.food_data) : favorite.food_data
        }));

        // Get grocery lists with items
        const groceryListsResult = await pool.query(
            "SELECT id, name, created_at, updated_at FROM grocery_lists WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        const groceryLists = await Promise.all(
            groceryListsResult.rows.map(async (list) => {
                const itemsResult = await pool.query(
                    "SELECT id, food_id, food_label, food_data, quantity, unit, notes, created_at FROM grocery_list_items WHERE list_id = $1 ORDER BY LOWER(food_label) ASC",
                    [list.id]
                );

                const items = itemsResult.rows.map(item => ({
                    ...item,
                    food_data: item.food_data && typeof item.food_data === "string" ? JSON.parse(item.food_data) : item.food_data
                }));

                return {
                    ...list,
                    items
                };
            })
        );

        // Get food tracking data
        const foodTrackingResult = await pool.query(
            "SELECT id, item_type, food_id, food_label, food_data, recipe_data, quantity, measure_uri, measure_label, category, date, timezone, nutrients, created_at, updated_at FROM food_tracking WHERE user_id = $1 ORDER BY date DESC, created_at DESC",
            [userId]
        );

        const foodTracking = foodTrackingResult.rows.map(entry => ({
            ...entry,
            food_data: entry.food_data && typeof entry.food_data === "string" ? JSON.parse(entry.food_data) : entry.food_data,
            recipe_data: entry.recipe_data && typeof entry.recipe_data === "string" ? JSON.parse(entry.recipe_data) : entry.recipe_data,
            nutrients: entry.nutrients && typeof entry.nutrients === "string" ? JSON.parse(entry.nutrients) : entry.nutrients
        }));

        // Get progress tracking data
        const progressTrackingResult = await pool.query(
            "SELECT id, activity_type, activity_name, date, timezone, activity_data, calories_burned, created_at, updated_at FROM progress_tracking WHERE user_id = $1 ORDER BY date DESC, created_at DESC",
            [userId]
        );

        const progressTracking = progressTrackingResult.rows.map(entry => ({
            ...entry,
            activity_data: entry.activity_data && typeof entry.activity_data === "string" ? JSON.parse(entry.activity_data) : entry.activity_data
        }));

        // Get weight tracking data
        const weightTrackingResult = await pool.query(
            "SELECT id, weight, unit, date, timezone, created_at, updated_at FROM weight_tracking WHERE user_id = $1 ORDER BY date DESC, created_at DESC",
            [userId]
        );

        const weightTracking = weightTrackingResult.rows.map(entry => ({
            ...entry,
            weight: parseFloat(String(entry.weight))
        }));

        // Get TDEE data
        const tdeeResult = await pool.query(
            "SELECT id, age, gender, height_cm, activity_level, bmr, tdee, created_at, updated_at FROM user_tdee WHERE user_id = $1",
            [userId]
        );

        const tdee = tdeeResult.rows.length > 0 ? {
            ...tdeeResult.rows[0],
            age: parseInt(String(tdeeResult.rows[0].age)),
            height_cm: parseFloat(String(tdeeResult.rows[0].height_cm)),
            bmr: parseFloat(String(tdeeResult.rows[0].bmr)),
            tdee: parseFloat(String(tdeeResult.rows[0].tdee))
        } : null;

        // Get user settings
        const settingsResult = await pool.query(
            "SELECT quick_add_days, weight_goal, target_weight, target_weight_unit, communication_email, communication_sms, communication_push, created_at, updated_at FROM user_settings WHERE user_id = $1",
            [userId]
        );

        const settings = settingsResult.rows.length > 0 ? {
            quick_add_days: settingsResult.rows[0].quick_add_days,
            weight_goal: settingsResult.rows[0].weight_goal,
            target_weight: settingsResult.rows[0].target_weight ? parseFloat(String(settingsResult.rows[0].target_weight)) : null,
            target_weight_unit: settingsResult.rows[0].target_weight_unit,
            communication_email: settingsResult.rows[0].communication_email ?? true,
            communication_sms: settingsResult.rows[0].communication_sms ?? false,
            communication_push: settingsResult.rows[0].communication_push ?? false,
            created_at: settingsResult.rows[0].created_at,
            updated_at: settingsResult.rows[0].updated_at
        } : {
            quick_add_days: 30, // Default value if no settings exist
            weight_goal: null,
            target_weight: null,
            target_weight_unit: null,
            communication_email: true,
            communication_sms: false,
            communication_push: false
        };

        // Compile all data
        const exportData = {
            export_date: new Date().toISOString(),
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                country: user.country,
                terms_accepted: user.terms_accepted,
                terms_accepted_at: user.terms_accepted_at,
                plan: user.plan,
                plan_selected_at: user.plan_selected_at,
                subscribed: user.subscribed,
                subscribed_at: user.subscribed_at,
                account_created_at: user.created_at,
                last_updated_at: user.updated_at
            },
            settings: settings,
            recipes: recipes,
            favorites: favorites,
            grocery_lists: groceryLists,
            food_tracking: foodTracking,
            progress_tracking: progressTracking,
            weight_tracking: weightTracking,
            tdee: tdee,
            summary: {
                total_recipes: recipes.length,
                total_favorites: favorites.length,
                total_grocery_lists: groceryLists.length,
                total_grocery_list_items: groceryLists.reduce((sum, list) => sum + list.items.length, 0),
                total_food_tracking_entries: foodTracking.length,
                total_progress_tracking_entries: progressTracking.length,
                total_weight_tracking_entries: weightTracking.length,
                has_tdee_data: tdee !== null
            }
        };

        // Set headers for file download
        const filename = `nobullfit-data-export-${new Date().toISOString().split("T")[0]}.json`;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

        // Send JSON response
        res.status(200).json(exportData);
    } catch (error) {
        console.error("Error exporting user data:", error);
        return res.status(500).json({ error: "An error occurred while exporting your data. Please try again later." });
    }
}
