import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

interface MacroRecommendation {
    protein: number;
    carbs: number;
    fat: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
}

interface WeeklyProgress {
    weekStart: string;
    weekEnd: string;
    startWeight: number | null;
    endWeight: number | null;
    weightChange: number | null;
    avgCaloriesConsumed: number;
    avgCaloriesBurned: number;
    avgNetCalories: number;
}

interface GoalInsights {
    weightGoal: "lose" | "maintain" | "gain";
    targetWeight: number | null;
    currentWeight: number | null;
    weightUnit: string;
    tdee: number;
    recommendedCalories: number;
    calorieAdjustment: number;
    macros: MacroRecommendation;
    weeklyProgress: WeeklyProgress[];
    projectedWeeksToGoal: number | null;
    projectedDate: string | null;
    weeklyTargetChange: number;
    actualWeeklyChange: number | null;
}

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

// Activity level multipliers for protein (g/kg of reference weight)
const PROTEIN_BY_ACTIVITY: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.4,
    moderately_active: 1.6,
    very_active: 1.8,
    extremely_active: 2.0
};

// Calculate macro recommendations based on goal and activity level
// targetWeightKg is optional - if provided (for weight loss/gain), use it for protein calculation
function calculateMacros(
    tdee: number, 
    goal: "lose" | "maintain" | "gain", 
    currentWeightKg: number,
    targetWeightKg: number | null,
    activityLevel: string
): MacroRecommendation {
    let adjustedCalories = tdee;
    let proteinRatio: number;
    let carbsRatio: number;
    let fatRatio: number;

    // Adjust calories based on goal
    // 500 calorie deficit = ~1 lb/week or ~0.45kg/week weight loss
    // 300 calorie surplus for lean muscle gain
    switch (goal) {
        case "lose":
            adjustedCalories = tdee - 500;
            // Higher protein ratio for muscle preservation during deficit
            proteinRatio = 35;
            carbsRatio = 35;
            fatRatio = 30;
            break;
        case "gain":
            adjustedCalories = tdee + 300;
            // Higher protein and carbs for muscle building
            proteinRatio = 30;
            carbsRatio = 45;
            fatRatio = 25;
            break;
        case "maintain":
        default:
            // Balanced macro split for maintenance
            proteinRatio = 30;
            carbsRatio = 40;
            fatRatio = 30;
            break;
    }

    // Calculate grams (protein & carbs = 4 cal/g, fat = 9 cal/g)
    const proteinCals = adjustedCalories * (proteinRatio / 100);
    const carbsCals = adjustedCalories * (carbsRatio / 100);
    const fatCals = adjustedCalories * (fatRatio / 100);

    // Calculate protein based on target weight or a reasonable estimate
    // For overweight individuals, using current weight gives unrealistic protein targets
    // Use: target weight if provided, otherwise estimate a reasonable weight
    let referenceWeightKg: number;
    
    if (targetWeightKg !== null) {
        // Use target weight for protein calculation
        referenceWeightKg = targetWeightKg;
    } else if (goal === "lose") {
        // Estimate a reasonable target: cap at 100kg (220 lbs) for protein calculation
        referenceWeightKg = Math.min(currentWeightKg, 100);
    } else {
        // For maintenance or gain, use current weight but cap at reasonable amount
        referenceWeightKg = Math.min(currentWeightKg, 120);
    }

    // Get protein multiplier based on activity level
    // More active individuals need more protein for muscle repair and growth
    const proteinMultiplier = PROTEIN_BY_ACTIVITY[activityLevel] || 1.6;
    
    // For weight loss, add a small bonus to help preserve muscle during deficit
    const adjustedMultiplier = goal === "lose" ? proteinMultiplier + 0.2 : proteinMultiplier;
    
    // Calculate protein based on activity-adjusted multiplier
    const proteinFromWeight = Math.round(referenceWeightKg * adjustedMultiplier);
    
    // Use the higher of ratio-based or weight-based, but cap at a reasonable maximum
    const proteinFromRatio = Math.round(proteinCals / 4);
    const proteinGrams = Math.min(
        Math.max(proteinFromRatio, proteinFromWeight),
        220 // Cap at 220g max regardless
    );

    return {
        protein: proteinRatio,
        carbs: carbsRatio,
        fat: fatRatio,
        proteinGrams,
        carbsGrams: Math.round(carbsCals / 4),
        fatGrams: Math.round(fatCals / 9)
    };
}

// Get goal insights (Pro feature)
export async function handleGetGoalInsights(req: Request, res: Response): Promise<void> {
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

        // Check if user is Pro
        const userResult = await pool.query(
            "SELECT subscribed FROM users WHERE id = $1",
            [userId]
        );

        if (!userResult.rows[0]?.subscribed) {
            res.status(403).json({ error: "Goal insights is a Pro feature" });
            return;
        }

        // Get user settings
        const settingsResult = await pool.query(
            "SELECT weight_goal, target_weight, target_weight_unit FROM user_settings WHERE user_id = $1",
            [userId]
        );

        const weightGoal = settingsResult.rows[0]?.weight_goal;
        const storedTargetWeight = settingsResult.rows[0]?.target_weight 
            ? parseFloat(settingsResult.rows[0].target_weight) 
            : null;
        const storedTargetWeightUnit = settingsResult.rows[0]?.target_weight_unit;

        if (!weightGoal) {
            res.status(200).json({
                hasGoal: false,
                message: "No weight goal set. Set your goal in the TDEE page."
            });
            return;
        }

        // Get TDEE and activity level
        const tdeeResult = await pool.query(
            "SELECT tdee, activity_level FROM user_tdee WHERE user_id = $1",
            [userId]
        );

        if (tdeeResult.rows.length === 0) {
            res.status(200).json({
                hasGoal: true,
                hasTdee: false,
                message: "Please calculate your TDEE first to see goal insights."
            });
            return;
        }

        const tdee = parseFloat(tdeeResult.rows[0].tdee);
        const activityLevel = tdeeResult.rows[0].activity_level;

        // Get current weight (most recent entry)
        const weightResult = await pool.query(
            "SELECT weight, unit FROM weight_tracking WHERE user_id = $1 ORDER BY date DESC LIMIT 1",
            [userId]
        );

        if (weightResult.rows.length === 0) {
            res.status(200).json({
                hasGoal: true,
                hasTdee: true,
                hasWeight: false,
                message: "Please log your weight in Progress Tracking to see goal insights."
            });
            return;
        }

        const currentWeight = parseFloat(weightResult.rows[0].weight);
        const weightUnit = weightResult.rows[0].unit;

        // Convert weight to kg for calculations if needed
        const weightKg = weightUnit === "lbs" ? currentWeight * 0.453592 : currentWeight;

        // Convert target weight to user's current unit for display
        // If stored unit is different from current unit, convert it
        let targetWeight: number | null = null;
        let targetWeightKg: number | null = null;
        
        if (storedTargetWeight !== null) {
            // Determine the stored unit (default to current user's unit if not set)
            const originalUnit = storedTargetWeightUnit || weightUnit;
            
            // Convert to kg first for calculations
            targetWeightKg = originalUnit === "lbs" 
                ? storedTargetWeight * 0.453592 
                : storedTargetWeight;
            
            // Convert to user's current display unit
            if (originalUnit === weightUnit) {
                // Same unit, no conversion needed
                targetWeight = storedTargetWeight;
            } else if (originalUnit === "lbs" && weightUnit === "kg") {
                // Convert lbs to kg
                targetWeight = Math.round(storedTargetWeight * 0.453592 * 10) / 10;
            } else if (originalUnit === "kg" && weightUnit === "lbs") {
                // Convert kg to lbs
                targetWeight = Math.round(storedTargetWeight * 2.20462 * 10) / 10;
            } else {
                targetWeight = storedTargetWeight;
            }
        }

        // Calculate recommended calories and macros
        let recommendedCalories = tdee;
        let calorieAdjustment = 0;
        const weeklyTargetChange = weightUnit === "lbs" ? 1 : 0.5;

        switch (weightGoal) {
            case "lose":
                calorieAdjustment = -500;
                recommendedCalories = tdee - 500;
                break;
            case "gain":
                calorieAdjustment = 300;
                recommendedCalories = tdee + 300;
                break;
            case "maintain":
            default:
                calorieAdjustment = 0;
                recommendedCalories = tdee;
                break;
        }

        const macros = calculateMacros(tdee, weightGoal, weightKg, targetWeightKg, activityLevel);

        // Get weekly progress (last 8 weeks)
        const timezone = req.query.timezone as string || "UTC";
        const weeklyProgressResult = await pool.query(
            `WITH weekly_weights AS (
                SELECT 
                    date_trunc('week', date) as week_start,
                    MIN(CASE WHEN date = (SELECT MIN(date) FROM weight_tracking w2 WHERE w2.user_id = $1 AND date_trunc('week', w2.date) = date_trunc('week', wt.date)) THEN weight END) as start_weight,
                    MAX(CASE WHEN date = (SELECT MAX(date) FROM weight_tracking w2 WHERE w2.user_id = $1 AND date_trunc('week', w2.date) = date_trunc('week', wt.date)) THEN weight END) as end_weight
                FROM weight_tracking wt
                WHERE user_id = $1
                    AND date >= CURRENT_DATE - INTERVAL '8 weeks'
                GROUP BY date_trunc('week', date)
            ),
            weekly_food AS (
                SELECT 
                    date_trunc('week', date) as week_start,
                    AVG((nutrients->>'ENERC_KCAL')::numeric) as avg_calories
                FROM food_tracking
                WHERE user_id = $1
                    AND date >= CURRENT_DATE - INTERVAL '8 weeks'
                GROUP BY date_trunc('week', date)
            ),
            weekly_activity AS (
                SELECT 
                    date_trunc('week', date) as week_start,
                    AVG(calories_burned) as avg_burned
                FROM progress_tracking
                WHERE user_id = $1
                    AND date >= CURRENT_DATE - INTERVAL '8 weeks'
                GROUP BY date_trunc('week', date)
            )
            SELECT 
                ww.week_start,
                ww.week_start + INTERVAL '6 days' as week_end,
                ww.start_weight,
                ww.end_weight,
                COALESCE(wf.avg_calories, 0) as avg_calories_consumed,
                COALESCE(wa.avg_burned, 0) as avg_calories_burned
            FROM weekly_weights ww
            LEFT JOIN weekly_food wf ON ww.week_start = wf.week_start
            LEFT JOIN weekly_activity wa ON ww.week_start = wa.week_start
            ORDER BY ww.week_start DESC
            LIMIT 8`,
            [userId]
        );

        const weeklyProgress: WeeklyProgress[] = weeklyProgressResult.rows.map(row => ({
            weekStart: row.week_start.toISOString().split("T")[0],
            weekEnd: row.week_end.toISOString().split("T")[0],
            startWeight: row.start_weight ? parseFloat(row.start_weight) : null,
            endWeight: row.end_weight ? parseFloat(row.end_weight) : null,
            weightChange: row.start_weight && row.end_weight 
                ? parseFloat(row.end_weight) - parseFloat(row.start_weight) 
                : null,
            avgCaloriesConsumed: Math.round(parseFloat(row.avg_calories_consumed) || 0),
            avgCaloriesBurned: Math.round(parseFloat(row.avg_calories_burned) || 0),
            avgNetCalories: Math.round((parseFloat(row.avg_calories_consumed) || 0) - (parseFloat(row.avg_calories_burned) || 0))
        }));

        // Calculate actual weekly change (average of recent weeks with data)
        const weeksWithChange = weeklyProgress.filter(w => w.weightChange !== null);
        const actualWeeklyChange = weeksWithChange.length > 0
            ? weeksWithChange.reduce((sum, w) => sum + (w.weightChange || 0), 0) / weeksWithChange.length
            : null;

        // Calculate projected timeline to goal weight
        let projectedWeeksToGoal: number | null = null;
        let projectedDate: string | null = null;

        if (targetWeight !== null && weightGoal !== "maintain") {
            const weightToChange = Math.abs(targetWeight - currentWeight);
            const weeklyRate = actualWeeklyChange !== null 
                ? Math.abs(actualWeeklyChange) 
                : weeklyTargetChange;

            if (weeklyRate > 0) {
                projectedWeeksToGoal = Math.ceil(weightToChange / weeklyRate);
                const projectedDateObj = new Date();
                projectedDateObj.setDate(projectedDateObj.getDate() + (projectedWeeksToGoal * 7));
                projectedDate = projectedDateObj.toISOString().split("T")[0];
            }
        }

        const insights: GoalInsights = {
            weightGoal,
            targetWeight,
            currentWeight,
            weightUnit,
            tdee,
            recommendedCalories: Math.round(recommendedCalories),
            calorieAdjustment,
            macros,
            weeklyProgress,
            projectedWeeksToGoal,
            projectedDate,
            weeklyTargetChange: weightGoal === "lose" ? -weeklyTargetChange : (weightGoal === "gain" ? weeklyTargetChange : 0),
            actualWeeklyChange
        };

        res.status(200).json({
            hasGoal: true,
            hasTdee: true,
            hasWeight: true,
            insights
        });
    } catch (error) {
        console.error("Error fetching goal insights:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
