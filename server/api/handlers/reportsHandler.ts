import type { Request, Response } from "express";
import puppeteer from "puppeteer";
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

// Format date for display
function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

// Format date range based on period
function getDateRangeLabel(period: string): string {
    if (period === "week") return "Last 7 Days";
    if (period === "month") return "Last 30 Days";
    return "All Time";
}

// Calculate macros percentages
function calculateMacroPercentages(protein: number, carbs: number, fat: number): { protein: number; carbs: number; fat: number } {
    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;
    const totalCals = proteinCals + carbsCals + fatCals;
    
    if (totalCals === 0) {
        return { protein: 0, carbs: 0, fat: 0 };
    }
    
    return {
        protein: Math.round((proteinCals / totalCals) * 100),
        carbs: Math.round((carbsCals / totalCals) * 100),
        fat: Math.round((fatCals / totalCals) * 100)
    };
}

// Generate HTML for the PDF report
function generateReportHTML(data: {
    userName: string;
    period: string;
    generatedAt: Date;
    stats: {
        today: {
            calories_consumed: number;
            calories_burned: number;
            protein: number;
            carbs: number;
            fat: number;
            food_count: number;
            activity_count: number;
        };
        averages: {
            calories_consumed: number;
            calories_burned: number;
            protein: number;
            carbs: number;
            fat: number;
        };
        dailyStats: Array<{
            date: string;
            calories_consumed: number;
            calories_burned: number;
            protein: number;
            carbs: number;
            fat: number;
        }>;
        activityTypes: Array<{
            type: string;
            count: number;
            total_calories: number;
        }>;
        categories: Array<{
            category: string;
            count: number;
            total_calories: number;
        }>;
        weightData: Array<{
            date: string;
            weight: number;
            unit: string;
        }>;
        weightUnit: string | null;
        tdee: {
            age: number;
            gender: string;
            height_cm: number;
            activity_level: string;
            bmr: number;
            tdee: number;
        } | null;
    };
}): string {
    const { userName, period, generatedAt, stats } = data;
    const dateRangeLabel = getDateRangeLabel(period);
    const macroPercentages = calculateMacroPercentages(
        stats.averages.protein,
        stats.averages.carbs,
        stats.averages.fat
    );
    
    // Check if user has meaningful data
    const hasCalorieData = stats.dailyStats.length > 0 && stats.dailyStats.some(d => d.calories_consumed > 0 || d.calories_burned > 0);
    const hasMacroData = stats.averages.protein > 0 || stats.averages.carbs > 0 || stats.averages.fat > 0;
    const hasWeightData = stats.weightData && stats.weightData.length > 0;
    const hasActivityData = stats.activityTypes && stats.activityTypes.length > 0;
    const hasFoodData = stats.categories && stats.categories.length > 0;
    const hasTDEEData = stats.tdee !== null;
    const hasAnyData = hasCalorieData || hasMacroData || hasWeightData || hasActivityData || hasFoodData || hasTDEEData;
    
    // Calculate weight change if data exists
    let weightChange = null;
    if (hasWeightData && stats.weightData.length >= 2) {
        const startWeight = stats.weightData[0].weight;
        const endWeight = stats.weightData[stats.weightData.length - 1].weight;
        weightChange = {
            start: startWeight,
            end: endWeight,
            change: Math.round((endWeight - startWeight) * 10) / 10,
            unit: stats.weightUnit || "kg"
        };
    }
    
    // Format activity level for display
    const formatActivityLevel = (level: string): string => {
        const levels: Record<string, string> = {
            sedentary: "Sedentary (little or no exercise)",
            light: "Lightly Active (1-3 days/week)",
            moderate: "Moderately Active (3-5 days/week)",
            active: "Very Active (6-7 days/week)",
            very_active: "Extra Active (very intense exercise)"
        };
        return levels[level] || level;
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NoBullFit Health Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #1f2937;
            line-height: 1.6;
            background: #ffffff;
        }
        
        .page {
            page-break-after: always;
            min-height: 100vh;
            padding: 48px;
        }
        
        .page:last-child {
            page-break-after: avoid;
        }
        
        /* Cover Page */
        .cover-page {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
            color: white;
        }
        
        .logo {
            font-size: 64px;
            font-weight: 800;
            letter-spacing: -2px;
            margin-bottom: 16px;
        }
        
        .motto {
            font-size: 24px;
            font-weight: 300;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 48px;
            color: #60a5fa;
        }
        
        .report-title {
            font-size: 36px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        
        .report-period {
            font-size: 20px;
            color: #94a3b8;
            margin-bottom: 48px;
        }
        
        .user-name {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .generated-date {
            font-size: 14px;
            color: #94a3b8;
        }
        
        .website-url {
            position: absolute;
            bottom: 48px;
            font-size: 16px;
            color: #60a5fa;
            text-decoration: none;
        }
        
        /* Content Pages */
        .content-page {
            background: #ffffff;
        }
        
        .page-header {
            border-bottom: 3px solid #1e3a5f;
            padding-bottom: 16px;
            margin-bottom: 32px;
        }
        
        .page-title {
            font-size: 28px;
            font-weight: 700;
            color: #1e3a5f;
        }
        
        .section {
            margin-bottom: 32px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        
        .stat-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        
        .stat-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #1e3a5f;
        }
        
        .stat-unit {
            font-size: 14px;
            color: #64748b;
            font-weight: 400;
        }
        
        .two-col {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #64748b;
            font-size: 14px;
        }
        
        .info-value {
            font-weight: 600;
            color: #1f2937;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        
        tr:nth-child(even) {
            background: #fafafa;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        /* Macro bars */
        .macro-bar-container {
            margin-bottom: 16px;
        }
        
        .macro-bar-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 14px;
        }
        
        .macro-bar {
            height: 24px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .macro-bar-fill {
            height: 100%;
            border-radius: 4px;
        }
        
        .macro-protein { background: #3b82f6; }
        .macro-carbs { background: #10b981; }
        .macro-fat { background: #f59e0b; }
        
        /* Weight change indicator */
        .weight-change {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
        }
        
        .weight-loss {
            background: #dcfce7;
            color: #166534;
        }
        
        .weight-gain {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .weight-neutral {
            background: #f3f4f6;
            color: #374151;
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 48px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px dashed #cbd5e1;
        }
        
        .empty-state-title {
            font-size: 18px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
        }
        
        .empty-state-text {
            color: #64748b;
            font-size: 14px;
        }
        
        /* Footer */
        .page-footer {
            position: absolute;
            bottom: 32px;
            left: 48px;
            right: 48px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #94a3b8;
        }
        
        /* Positive/Negative indicators */
        .positive { color: #059669; }
        .negative { color: #dc2626; }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="page cover-page">
        <div class="logo">NoBullFit</div>
        <div class="motto">Track. Improve. Repeat.</div>
        <div class="report-title">Health &amp; Nutrition Report</div>
        <div class="report-period">${dateRangeLabel}</div>
        <div class="user-name">Prepared for ${userName}</div>
        <div class="generated-date">Generated on ${formatDate(generatedAt)}</div>
        <div class="website-url">nobull.fit</div>
    </div>
    
    ${!hasAnyData ? `
    <!-- No Data Page -->
    <div class="page content-page">
        <div class="page-header">
            <div class="page-title">Getting Started</div>
        </div>
        <div class="empty-state" style="margin-top: 100px;">
            <div class="empty-state-title">No Data Available Yet</div>
            <div class="empty-state-text" style="max-width: 500px; margin: 0 auto;">
                <p style="margin-bottom: 16px;">
                    Welcome to NoBullFit! It looks like you haven't started tracking your health journey yet.
                </p>
                <p style="margin-bottom: 16px;">
                    To see detailed insights in your report, start by:
                </p>
                <ul style="text-align: left; display: inline-block; margin-bottom: 16px;">
                    <li>Logging your daily food intake</li>
                    <li>Recording your activities and exercises</li>
                    <li>Tracking your weight regularly</li>
                    <li>Setting up your TDEE calculator</li>
                </ul>
                <p>
                    Once you have data, your reports will include comprehensive analytics 
                    and insights to help you reach your health goals.
                </p>
            </div>
        </div>
    </div>
    ` : `
    <!-- Summary Page -->
    <div class="page content-page">
        <div class="page-header">
            <div class="page-title">Executive Summary</div>
        </div>
        
        ${hasTDEEData ? `
        <div class="section">
            <div class="section-title">Metabolic Profile</div>
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-label">Basal Metabolic Rate</div>
                    <div class="stat-value">${Math.round(stats.tdee!.bmr)} <span class="stat-unit">cal/day</span></div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Total Daily Energy Expenditure</div>
                    <div class="stat-value">${Math.round(stats.tdee!.tdee)} <span class="stat-unit">cal/day</span></div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Activity Level</div>
                    <div class="stat-value" style="font-size: 16px;">${formatActivityLevel(stats.tdee!.activity_level)}</div>
                </div>
            </div>
        </div>
        ` : `
        <div class="section">
            <div class="section-title">Metabolic Profile</div>
            <div class="empty-state">
                <div class="empty-state-title">TDEE Not Calculated</div>
                <div class="empty-state-text">Set up your TDEE calculator to see your metabolic profile and recommended calorie intake.</div>
            </div>
        </div>
        `}
        
        ${hasCalorieData ? `
        <div class="section">
            <div class="section-title">Average Daily Intake (${dateRangeLabel})</div>
            <div class="stat-grid">
                <div class="stat-box">
                    <div class="stat-label">Calories Consumed</div>
                    <div class="stat-value">${stats.averages.calories_consumed} <span class="stat-unit">cal</span></div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Calories Burned</div>
                    <div class="stat-value">${stats.averages.calories_burned} <span class="stat-unit">cal</span></div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Net Calories</div>
                    <div class="stat-value ${stats.averages.calories_consumed - stats.averages.calories_burned > 0 ? "" : "positive"}">
                        ${stats.averages.calories_consumed - stats.averages.calories_burned > 0 ? "+" : ""}${stats.averages.calories_consumed - stats.averages.calories_burned} <span class="stat-unit">cal</span>
                    </div>
                </div>
            </div>
        </div>
        ` : `
        <div class="section">
            <div class="section-title">Calorie Summary</div>
            <div class="empty-state">
                <div class="empty-state-title">No Calorie Data</div>
                <div class="empty-state-text">Start logging your food and activities to see calorie insights.</div>
            </div>
        </div>
        `}
        
        ${hasWeightData && weightChange ? `
        <div class="section">
            <div class="section-title">Weight Progress</div>
            <div class="two-col">
                <div>
                    <div class="info-row">
                        <span class="info-label">Starting Weight</span>
                        <span class="info-value">${weightChange.start} ${weightChange.unit}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Current Weight</span>
                        <span class="info-value">${weightChange.end} ${weightChange.unit}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; justify-content: center;">
                    <div>
                        <div style="text-align: center; margin-bottom: 8px; font-size: 12px; color: #64748b;">Net Change</div>
                        <span class="weight-change ${weightChange.change < 0 ? "weight-loss" : weightChange.change > 0 ? "weight-gain" : "weight-neutral"}">
                            ${weightChange.change > 0 ? "+" : ""}${weightChange.change} ${weightChange.unit}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        ` : ""}
    </div>
    
    <!-- Nutrition Details Page -->
    <div class="page content-page">
        <div class="page-header">
            <div class="page-title">Nutrition Analysis</div>
        </div>
        
        ${hasMacroData ? `
        <div class="section">
            <div class="section-title">Average Daily Macronutrients</div>
            <div class="macro-bar-container">
                <div class="macro-bar-label">
                    <span>Protein</span>
                    <span>${stats.averages.protein}g (${macroPercentages.protein}%)</span>
                </div>
                <div class="macro-bar">
                    <div class="macro-bar-fill macro-protein" style="width: ${macroPercentages.protein}%"></div>
                </div>
            </div>
            <div class="macro-bar-container">
                <div class="macro-bar-label">
                    <span>Carbohydrates</span>
                    <span>${stats.averages.carbs}g (${macroPercentages.carbs}%)</span>
                </div>
                <div class="macro-bar">
                    <div class="macro-bar-fill macro-carbs" style="width: ${macroPercentages.carbs}%"></div>
                </div>
            </div>
            <div class="macro-bar-container">
                <div class="macro-bar-label">
                    <span>Fat</span>
                    <span>${stats.averages.fat}g (${macroPercentages.fat}%)</span>
                </div>
                <div class="macro-bar">
                    <div class="macro-bar-fill macro-fat" style="width: ${macroPercentages.fat}%"></div>
                </div>
            </div>
        </div>
        ` : `
        <div class="section">
            <div class="section-title">Macronutrient Breakdown</div>
            <div class="empty-state">
                <div class="empty-state-title">No Macro Data</div>
                <div class="empty-state-text">Log foods with nutritional information to see your macronutrient breakdown.</div>
            </div>
        </div>
        `}
        
        ${hasFoodData ? `
        <div class="section">
            <div class="section-title">Food Categories</div>
            <table>
                <thead>
                    <tr>
                        <th>Category</th>
                        <th class="text-right">Items Logged</th>
                        <th class="text-right">Total Calories</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.categories.map(cat => `
                    <tr>
                        <td>${cat.category}</td>
                        <td class="text-right">${cat.count}</td>
                        <td class="text-right">${Math.round(cat.total_calories)}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
        ` : `
        <div class="section">
            <div class="section-title">Food Categories</div>
            <div class="empty-state">
                <div class="empty-state-title">No Food Data</div>
                <div class="empty-state-text">Log your meals to see which food categories make up your diet.</div>
            </div>
        </div>
        `}
    </div>
    
    <!-- Activity & Daily Log Page -->
    <div class="page content-page">
        <div class="page-header">
            <div class="page-title">Activity &amp; Daily Log</div>
        </div>
        
        ${hasActivityData ? `
        <div class="section">
            <div class="section-title">Activity Breakdown</div>
            <table>
                <thead>
                    <tr>
                        <th>Activity Type</th>
                        <th class="text-right">Sessions</th>
                        <th class="text-right">Total Calories Burned</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.activityTypes.map(act => `
                    <tr>
                        <td>${act.type}</td>
                        <td class="text-right">${act.count}</td>
                        <td class="text-right">${Math.round(act.total_calories)}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
        ` : `
        <div class="section">
            <div class="section-title">Activity Summary</div>
            <div class="empty-state">
                <div class="empty-state-title">No Activities Logged</div>
                <div class="empty-state-text">Track your workouts and activities to see your exercise patterns.</div>
            </div>
        </div>
        `}
        
        ${hasCalorieData && stats.dailyStats.length > 0 ? `
        <div class="section">
            <div class="section-title">Daily Summary</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th class="text-right">Calories In</th>
                        <th class="text-right">Calories Out</th>
                        <th class="text-right">Net</th>
                        <th class="text-right">Protein</th>
                        <th class="text-right">Carbs</th>
                        <th class="text-right">Fat</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.dailyStats.slice(-14).map(day => {
                        const net = Math.round(day.calories_consumed - day.calories_burned);
                        const dateObj = new Date(day.date + "T00:00:00");
                        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        return `
                        <tr>
                            <td>${formattedDate}</td>
                            <td class="text-right">${Math.round(day.calories_consumed)}</td>
                            <td class="text-right">${Math.round(day.calories_burned)}</td>
                            <td class="text-right ${net < 0 ? "positive" : ""}">${net > 0 ? "+" : ""}${net}</td>
                            <td class="text-right">${Math.round(day.protein)}g</td>
                            <td class="text-right">${Math.round(day.carbs)}g</td>
                            <td class="text-right">${Math.round(day.fat)}g</td>
                        </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
            ${stats.dailyStats.length > 14 ? `<p style="margin-top: 8px; font-size: 12px; color: #64748b;">Showing last 14 days of ${stats.dailyStats.length} total days</p>` : ""}
        </div>
        ` : ""}
    </div>
    
    ${hasWeightData && stats.weightData.length > 0 ? `
    <!-- Weight History Page -->
    <div class="page content-page">
        <div class="page-header">
            <div class="page-title">Weight History</div>
        </div>
        
        <div class="section">
            <div class="section-title">Weight Log</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th class="text-right">Weight (${stats.weightUnit})</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.weightData.map(entry => {
                        const dateObj = new Date(entry.date + "T00:00:00");
                        const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                        return `
                        <tr>
                            <td>${formattedDate}</td>
                            <td class="text-right">${entry.weight}</td>
                        </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    </div>
    ` : ""}
    `}
</body>
</html>`;
}

// Generate PDF report handler
export async function handleGenerateDashboardReport(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { period = "week" } = req.body;
        const userTimezone = req.body.timezone as string || "UTC";

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user info
        const userResult = await pool.query(
            "SELECT id, email, full_name FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const userName = userResult.rows[0].full_name || "User";

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
            startDate = new Date(0);
        }

        const startDateStr = startDate.toISOString().split("T")[0];

        // Get today's date in user's timezone
        let todayStr: string;
        if (userTimezone && userTimezone !== "UTC") {
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
        
        // Fetch all the same data as dashboard stats
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

        const todayActivityResult = await pool.query(
            `SELECT 
                COALESCE(SUM(calories_burned), 0) as calories_burned,
                COUNT(*) as activity_count
             FROM progress_tracking 
             WHERE user_id = $1 AND date = $2`,
            [userId, todayStr]
        );

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

        // Process weight data
        const weightData: Array<{ date: string; weight: number; unit: string }> = [];
        let standardUnit: string = "kg";
        
        if (weightResult.rows.length > 0) {
            const lastEntry = weightResult.rows[weightResult.rows.length - 1];
            standardUnit = lastEntry.unit || "kg";
            
            weightResult.rows.forEach((row: { date: Date | string; weight: number; unit: string }) => {
                const dateStr = row.date instanceof Date 
                    ? row.date.toISOString().split("T")[0] 
                    : String(row.date);
                
                let convertedWeight = parseFloat(String(row.weight));
                const entryUnit = row.unit || "kg";
                
                if (entryUnit !== standardUnit) {
                    if (entryUnit === "kg" && standardUnit === "lbs") {
                        convertedWeight = convertedWeight * 2.20462;
                    } else if (entryUnit === "lbs" && standardUnit === "kg") {
                        convertedWeight = convertedWeight / 2.20462;
                    }
                }
                
                weightData.push({
                    date: dateStr,
                    weight: Math.round(convertedWeight * 10) / 10,
                    unit: standardUnit
                });
            });
        }

        // Combine daily stats
        const dailyStats: Array<{
            date: string;
            calories_consumed: number;
            calories_burned: number;
            protein: number;
            carbs: number;
            fat: number;
        }> = [];

        const dateMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number; burned: number }>();

        weeklyFoodResult.rows.forEach((row: { date: Date | string; calories: number; protein: number; carbs: number; fat: number }) => {
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

        // Get TDEE data
        let tdee = null;
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
                tdee: parseFloat(String(tdeeResult.rows[0].tdee))
            };
        }

        // Build stats object
        const stats = {
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
            weightData,
            weightUnit: standardUnit,
            tdee
        };

        // Generate HTML
        const html = generateReportHTML({
            userName,
            period,
            generatedAt: now,
            stats
        });

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "0",
                right: "0",
                bottom: "0",
                left: "0"
            }
        });

        await browser.close();

        // Generate filename
        const dateStr = now.toISOString().split("T")[0];
        const filename = `NoBullFit_Report_${dateStr}.pdf`;

        // Send PDF response
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("Error generating dashboard report:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
}
