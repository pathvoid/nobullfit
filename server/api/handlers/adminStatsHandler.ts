import type { Request, Response } from "express";
import getAdminPool from "../../db/adminConnection.js";

// Get platform-wide admin stats (dev-only, uses admin/prod database)
export async function handleGetAdminStats(req: Request, res: Response): Promise<void> {
    // Block in production
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({ error: "Not found" });
        return;
    }

    try {
        const pool = await getAdminPool();
        if (!pool) {
            res.status(500).json({ error: "Admin database connection not available" });
            return;
        }

        // Total users and users created this week
        const usersResult = await pool.query(`
            SELECT
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as users_this_week,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as users_this_month
            FROM users
        `);

        // Total food tracking entries
        const foodTrackingResult = await pool.query(`
            SELECT COUNT(*) as total_entries
            FROM food_tracking
        `);

        // Total recipes
        const recipesResult = await pool.query(`
            SELECT COUNT(*) as total_recipes
            FROM recipes
        `);

        // Total progress tracking entries
        const progressResult = await pool.query(`
            SELECT COUNT(*) as total_entries
            FROM progress_tracking
        `);

        // Total reminders
        const remindersResult = await pool.query(`
            SELECT
                COUNT(*) as total_reminders,
                COUNT(*) FILTER (WHERE is_active = true) as active_reminders
            FROM reminders
        `);

        // Total integrations connected
        const integrationsResult = await pool.query(`
            SELECT COUNT(*) as total_integrations
            FROM integration_connections
        `);

        // Total grocery lists
        const groceryListsResult = await pool.query(`
            SELECT COUNT(*) as total_lists
            FROM grocery_lists
        `);

        // Total favorites
        const favoritesResult = await pool.query(`
            SELECT COUNT(*) as total_favorites
            FROM favorites
        `);

        // Active users (users who have logged food or activities in the last 7 days)
        const activeUsersResult = await pool.query(`
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM (
                SELECT user_id FROM food_tracking WHERE created_at >= NOW() - INTERVAL '7 days'
                UNION
                SELECT user_id FROM progress_tracking WHERE created_at >= NOW() - INTERVAL '7 days'
            ) active
        `);

        res.status(200).json({
            users: {
                total: parseInt(String(usersResult.rows[0]?.total_users)) || 0,
                this_week: parseInt(String(usersResult.rows[0]?.users_this_week)) || 0,
                this_month: parseInt(String(usersResult.rows[0]?.users_this_month)) || 0,
                active_last_7_days: parseInt(String(activeUsersResult.rows[0]?.active_users)) || 0
            },
            food_tracking: {
                total_entries: parseInt(String(foodTrackingResult.rows[0]?.total_entries)) || 0
            },
            recipes: {
                total: parseInt(String(recipesResult.rows[0]?.total_recipes)) || 0
            },
            progress_tracking: {
                total_entries: parseInt(String(progressResult.rows[0]?.total_entries)) || 0
            },
            reminders: {
                total: parseInt(String(remindersResult.rows[0]?.total_reminders)) || 0,
                active: parseInt(String(remindersResult.rows[0]?.active_reminders)) || 0
            },
            integrations: {
                total: parseInt(String(integrationsResult.rows[0]?.total_integrations)) || 0
            },
            grocery_lists: {
                total: parseInt(String(groceryListsResult.rows[0]?.total_lists)) || 0
            },
            favorites: {
                total: parseInt(String(favoritesResult.rows[0]?.total_favorites)) || 0
            }
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
