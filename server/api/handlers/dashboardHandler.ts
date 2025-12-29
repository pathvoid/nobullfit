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

// Get dashboard overview stats
export async function handleGetDashboardStats(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { period = "week" } = req.query; // week, month, or all
        const userTimezone = req.query.timezone as string || "UTC";

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;
        
        if (period === "week") {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === "month") {
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            // All time
            startDate = new Date(0);
        }

        const startDateStr = startDate.toISOString().split("T")[0];

        // Get today's stats - use user's timezone if provided
        let todayStr: string;
        if (userTimezone && userTimezone !== "UTC") {
            // Get today's date in user's timezone
            // Format: YYYY-MM-DD
            const formatter = new Intl.DateTimeFormat("en-CA", {
                timeZone: userTimezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
            todayStr = formatter.format(now);
        } else {
            todayStr = now.toISOString().split("T")[0];
        }
        
        // Today's food stats
        const todayFoodResult = await pool.query(
            `SELECT 
                COALESCE(SUM((nutrients->>'ENERC_KCAL')::numeric), 0) as calories,
                COALESCE(SUM((nutrients->>'PROCNT')::numeric), 0) as protein,
                COALESCE(SUM((nutrients->>'CHOCDF')::numeric), 0) as carbs,
                COALESCE(SUM((nutrients->>'FAT')::numeric), 0) as fat,
                COUNT(*) as food_count
             FROM food_tracking 
             WHERE user_id = $1 AND date = $2`,
            [userId, todayStr]
        );

        // Today's activity stats
        const todayActivityResult = await pool.query(
            `SELECT 
                COALESCE(SUM(calories_burned), 0) as calories_burned,
                COUNT(*) as activity_count
             FROM progress_tracking 
             WHERE user_id = $1 AND date = $2`,
            [userId, todayStr]
        );

        // Weekly stats (last 7 days)
        const weeklyFoodResult = await pool.query(
            `SELECT 
                date,
                COALESCE(SUM((nutrients->>'ENERC_KCAL')::numeric), 0) as calories,
                COALESCE(SUM((nutrients->>'PROCNT')::numeric), 0) as protein,
                COALESCE(SUM((nutrients->>'CHOCDF')::numeric), 0) as carbs,
                COALESCE(SUM((nutrients->>'FAT')::numeric), 0) as fat
             FROM food_tracking 
             WHERE user_id = $1 AND date >= $2
             GROUP BY date
             ORDER BY date ASC`,
            [userId, startDateStr]
        );

        const weeklyActivityResult = await pool.query(
            `SELECT 
                date,
                COALESCE(SUM(calories_burned), 0) as calories_burned,
                COUNT(*) as activity_count
             FROM progress_tracking 
             WHERE user_id = $1 AND date >= $2
             GROUP BY date
             ORDER BY date ASC`,
            [userId, startDateStr]
        );

        // Activity type distribution
        const activityTypeResult = await pool.query(
            `SELECT 
                activity_type,
                COUNT(*) as count,
                COALESCE(SUM(calories_burned), 0) as total_calories
             FROM progress_tracking 
             WHERE user_id = $1 AND date >= $2
             GROUP BY activity_type
             ORDER BY count DESC`,
            [userId, startDateStr]
        );

        // Category distribution for food
        const categoryResult = await pool.query(
            `SELECT 
                category,
                COUNT(*) as count,
                COALESCE(SUM((nutrients->>'ENERC_KCAL')::numeric), 0) as total_calories
             FROM food_tracking 
             WHERE user_id = $1 AND date >= $2
             GROUP BY category
             ORDER BY count DESC`,
            [userId, startDateStr]
        );

        // Weight tracking data - get most recent entry per date
        const weightResult = await pool.query(
            `SELECT DISTINCT ON (date)
                date,
                weight,
                unit,
                created_at
             FROM weight_tracking 
             WHERE user_id = $1 AND date >= $2
             ORDER BY date ASC, created_at DESC`,
            [userId, startDateStr]
        );

        // Process weight data - handle mixed units
        const weightData: Array<{ date: string; weight: number; unit: string }> = [];
        let standardUnit: string = "kg";
        
        if (weightResult.rows.length > 0) {
            // Get the last entry's unit to use as the standard
            const lastEntry = weightResult.rows[weightResult.rows.length - 1];
            standardUnit = lastEntry.unit || "kg";
            
            // Convert all weights to the standard unit
            weightResult.rows.forEach((row: { date: Date | string; weight: number; unit: string }) => {
                const dateStr = row.date instanceof Date 
                    ? row.date.toISOString().split("T")[0] 
                    : String(row.date);
                
                let convertedWeight = parseFloat(String(row.weight));
                const entryUnit = row.unit || "kg";
                
                // Convert to standard unit if needed
                if (entryUnit !== standardUnit) {
                    if (entryUnit === "kg" && standardUnit === "lbs") {
                        convertedWeight = convertedWeight * 2.20462;
                    } else if (entryUnit === "lbs" && standardUnit === "kg") {
                        convertedWeight = convertedWeight / 2.20462;
                    }
                }
                
                weightData.push({
                    date: dateStr,
                    weight: Math.round(convertedWeight * 10) / 10, // Round to 1 decimal
                    unit: standardUnit
                });
            });
        }

        // Combine daily stats for charts
        const dailyStats: Array<{
            date: string;
            calories_consumed: number;
            calories_burned: number;
            protein: number;
            carbs: number;
            fat: number;
        }> = [];

        // Create a map of dates
        const dateMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number; burned: number }>();

        weeklyFoodResult.rows.forEach((row: { date: Date | string; calories: number; protein: number; carbs: number; fat: number }) => {
            // Convert date to string if it's a Date object
            const dateStr = row.date instanceof Date 
                ? row.date.toISOString().split("T")[0] 
                : String(row.date);
            dateMap.set(dateStr, {
                calories: parseFloat(String(row.calories)) || 0,
                protein: parseFloat(String(row.protein)) || 0,
                carbs: parseFloat(String(row.carbs)) || 0,
                fat: parseFloat(String(row.fat)) || 0,
                burned: 0
            });
        });

        weeklyActivityResult.rows.forEach((row: { date: Date | string; calories_burned: number }) => {
            // Convert date to string if it's a Date object
            const dateStr = row.date instanceof Date 
                ? row.date.toISOString().split("T")[0] 
                : String(row.date);
            const existing = dateMap.get(dateStr);
            if (existing) {
                existing.burned = parseFloat(String(row.calories_burned)) || 0;
            } else {
                dateMap.set(dateStr, {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                    burned: parseFloat(String(row.calories_burned)) || 0
                });
            }
        });

        // Convert map to array and sort by date
        dateMap.forEach((stats, date) => {
            dailyStats.push({
                date,
                calories_consumed: stats.calories,
                calories_burned: stats.burned,
                protein: stats.protein,
                carbs: stats.carbs,
                fat: stats.fat
            });
        });

        dailyStats.sort((a, b) => a.date.localeCompare(b.date));

        // Calculate averages
        const totalDays = dailyStats.length || 1;
        const avgCaloriesConsumed = dailyStats.reduce((sum, day) => sum + day.calories_consumed, 0) / totalDays;
        const avgCaloriesBurned = dailyStats.reduce((sum, day) => sum + day.calories_burned, 0) / totalDays;
        const avgProtein = dailyStats.reduce((sum, day) => sum + day.protein, 0) / totalDays;
        const avgCarbs = dailyStats.reduce((sum, day) => sum + day.carbs, 0) / totalDays;
        const avgFat = dailyStats.reduce((sum, day) => sum + day.fat, 0) / totalDays;

        // Get TDEE data (only if user has weight data)
        let tdee = null;
        const weightCheckResult = await pool.query(
            "SELECT COUNT(*) as count FROM weight_tracking WHERE user_id = $1",
            [userId]
        );
        const hasWeight = parseInt(String(weightCheckResult.rows[0]?.count)) > 0;
        
        if (hasWeight) {
            const tdeeResult = await pool.query(
                "SELECT id, age, gender, height_cm, activity_level, bmr, tdee, created_at, updated_at FROM user_tdee WHERE user_id = $1",
                [userId]
            );

            if (tdeeResult.rows.length > 0) {
                tdee = {
                    age: parseInt(String(tdeeResult.rows[0].age)),
                    gender: tdeeResult.rows[0].gender,
                    height_cm: parseFloat(String(tdeeResult.rows[0].height_cm)),
                    activity_level: tdeeResult.rows[0].activity_level,
                    bmr: parseFloat(String(tdeeResult.rows[0].bmr)),
                    tdee: parseFloat(String(tdeeResult.rows[0].tdee)),
                    created_at: tdeeResult.rows[0].created_at,
                    updated_at: tdeeResult.rows[0].updated_at
                };
            }
        }

        const responseData = {
            today: {
                calories_consumed: parseFloat(String(todayFoodResult.rows[0]?.calories)) || 0,
                calories_burned: parseFloat(String(todayActivityResult.rows[0]?.calories_burned)) || 0,
                protein: parseFloat(String(todayFoodResult.rows[0]?.protein)) || 0,
                carbs: parseFloat(String(todayFoodResult.rows[0]?.carbs)) || 0,
                fat: parseFloat(String(todayFoodResult.rows[0]?.fat)) || 0,
                food_count: parseInt(String(todayFoodResult.rows[0]?.food_count)) || 0,
                activity_count: parseInt(String(todayActivityResult.rows[0]?.activity_count)) || 0
            },
            averages: {
                calories_consumed: Math.round(avgCaloriesConsumed),
                calories_burned: Math.round(avgCaloriesBurned),
                protein: Math.round(avgProtein),
                carbs: Math.round(avgCarbs),
                fat: Math.round(avgFat)
            },
            dailyStats,
            activityTypes: activityTypeResult.rows.map((row: { activity_type: string; count: number; total_calories: number }) => ({
                type: row.activity_type,
                count: parseInt(String(row.count)) || 0,
                total_calories: parseFloat(String(row.total_calories)) || 0
            })),
            categories: categoryResult.rows.map((row: { category: string; count: number; total_calories: number }) => ({
                category: row.category,
                count: parseInt(String(row.count)) || 0,
                total_calories: parseFloat(String(row.total_calories)) || 0
            })),
            weightData: weightData,
            weightUnit: standardUnit,
            tdee: tdee
        };
        
        res.status(200).json(responseData);
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
