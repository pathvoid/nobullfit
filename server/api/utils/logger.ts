import getPool from "../../db/connection.js";
import { verifyToken } from "./jwt.js";
import type { Request } from "express";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    action: string;
    message: string;
    userId?: number | null;
    userEmail?: string | null;
    method?: string;
    endpoint?: string;
    statusCode?: number;
    durationMs?: number;
    errorStack?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
}

// Action categorization map - maps route patterns to readable names
const ACTION_MAP: Array<{ pattern: RegExp; method: string; action: string }> = [
    // Auth
    { pattern: /^\/sign-up$/, method: "POST", action: "USER_SIGNUP" },
    { pattern: /^\/sign-in$/, method: "POST", action: "USER_SIGNIN" },
    { pattern: /^\/auth\/logout$/, method: "POST", action: "USER_LOGOUT" },
    { pattern: /^\/auth\/me$/, method: "GET", action: "AUTH_CHECK" },
    { pattern: /^\/auth\/select-plan$/, method: "POST", action: "PLAN_SELECTED" },
    { pattern: /^\/forgot-password$/, method: "POST", action: "FORGOT_PASSWORD" },
    { pattern: /^\/reset-password$/, method: "POST", action: "RESET_PASSWORD" },
    // Settings
    { pattern: /^\/settings\/change-email$/, method: "POST", action: "EMAIL_CHANGE_REQUEST" },
    { pattern: /^\/settings\/confirm-email-change$/, method: "POST", action: "EMAIL_CHANGE_CONFIRMED" },
    { pattern: /^\/settings\/change-password$/, method: "POST", action: "PASSWORD_CHANGED" },
    { pattern: /^\/settings\/delete-account$/, method: "POST", action: "ACCOUNT_DELETED" },
    { pattern: /^\/settings\/delete-data$/, method: "POST", action: "DATA_DELETED" },
    { pattern: /^\/settings\/export-data$/, method: "GET", action: "DATA_EXPORTED" },
    { pattern: /^\/settings\/preferences$/, method: "GET", action: "PREFERENCES_VIEWED" },
    { pattern: /^\/settings\/preferences$/, method: "PUT", action: "PREFERENCES_UPDATED" },
    // Food tracking
    { pattern: /^\/food-tracking$/, method: "POST", action: "FOOD_LOGGED" },
    { pattern: /^\/food-tracking\/copy-day$/, method: "POST", action: "FOOD_DAY_COPIED" },
    { pattern: /^\/food-tracking\/copy-week$/, method: "POST", action: "FOOD_WEEK_COPIED" },
    { pattern: /^\/food-tracking\/recent$/, method: "GET", action: "RECENT_FOODS_VIEWED" },
    { pattern: /^\/food-tracking\/\d+$/, method: "PUT", action: "FOOD_UPDATED" },
    { pattern: /^\/food-tracking\/\d+$/, method: "DELETE", action: "FOOD_DELETED" },
    { pattern: /^\/food-tracking$/, method: "GET", action: "FOOD_TRACKING_VIEWED" },
    // Food database
    { pattern: /^\/food-database\/search$/, method: "GET", action: "FOOD_SEARCH" },
    { pattern: /^\/food-database\/details\//, method: "GET", action: "FOOD_DETAILS_VIEWED" },
    // Favorites
    { pattern: /^\/favorites$/, method: "POST", action: "FAVORITE_ADDED" },
    { pattern: /^\/favorites\//, method: "DELETE", action: "FAVORITE_REMOVED" },
    { pattern: /^\/favorites$/, method: "GET", action: "FAVORITES_VIEWED" },
    // Recipes
    { pattern: /^\/recipes$/, method: "POST", action: "RECIPE_CREATED" },
    { pattern: /^\/recipes\/upload-image$/, method: "POST", action: "RECIPE_IMAGE_UPLOADED" },
    { pattern: /^\/recipes\/\d+$/, method: "PUT", action: "RECIPE_UPDATED" },
    { pattern: /^\/recipes\/\d+$/, method: "DELETE", action: "RECIPE_DELETED" },
    { pattern: /^\/recipes\/\d+$/, method: "GET", action: "RECIPE_VIEWED" },
    { pattern: /^\/recipes$/, method: "GET", action: "RECIPES_VIEWED" },
    // Progress tracking
    { pattern: /^\/progress-tracking$/, method: "POST", action: "ACTIVITY_LOGGED" },
    { pattern: /^\/progress-tracking\/copy-day$/, method: "POST", action: "ACTIVITY_DAY_COPIED" },
    { pattern: /^\/progress-tracking\/copy-week$/, method: "POST", action: "ACTIVITY_WEEK_COPIED" },
    { pattern: /^\/progress-tracking\/\d+$/, method: "PUT", action: "ACTIVITY_UPDATED" },
    { pattern: /^\/progress-tracking\/\d+$/, method: "DELETE", action: "ACTIVITY_DELETED" },
    // Weight tracking
    { pattern: /^\/weight-tracking$/, method: "POST", action: "WEIGHT_LOGGED" },
    { pattern: /^\/weight-tracking\/\d+$/, method: "DELETE", action: "WEIGHT_DELETED" },
    // TDEE
    { pattern: /^\/tdee$/, method: "POST", action: "TDEE_SAVED" },
    { pattern: /^\/tdee$/, method: "GET", action: "TDEE_VIEWED" },
    // Dashboard
    { pattern: /^\/dashboard\/stats$/, method: "GET", action: "DASHBOARD_VIEWED" },
    { pattern: /^\/dashboard\/goal-insights$/, method: "GET", action: "GOAL_INSIGHTS_VIEWED" },
    { pattern: /^\/reports\/dashboard$/, method: "POST", action: "REPORT_GENERATED" },
    // Billing
    { pattern: /^\/billing\/checkout$/, method: "POST", action: "CHECKOUT_INITIATED" },
    { pattern: /^\/billing\/portal$/, method: "POST", action: "BILLING_PORTAL_OPENED" },
    { pattern: /^\/billing\/sync$/, method: "POST", action: "SUBSCRIPTION_SYNCED" },
    { pattern: /^\/billing\/subscription$/, method: "GET", action: "SUBSCRIPTION_VIEWED" },
    // Grocery lists
    { pattern: /^\/grocery-lists$/, method: "POST", action: "GROCERY_LIST_CREATED" },
    { pattern: /^\/grocery-lists\/\d+$/, method: "PUT", action: "GROCERY_LIST_UPDATED" },
    { pattern: /^\/grocery-lists\/\d+$/, method: "DELETE", action: "GROCERY_LIST_DELETED" },
    { pattern: /^\/grocery-lists\/\d+\/items$/, method: "POST", action: "GROCERY_ITEMS_ADDED" },
    { pattern: /^\/grocery-lists\/\d+\/send-email$/, method: "POST", action: "GROCERY_LIST_EMAILED" },
    { pattern: /^\/grocery-lists\/\d+\/add-recipe$/, method: "POST", action: "GROCERY_RECIPE_ADDED" },

    // Integrations
    { pattern: /^\/integrations\/\w+\/connect$/, method: "POST", action: "INTEGRATION_CONNECTED" },
    { pattern: /^\/integrations\/\w+$/, method: "DELETE", action: "INTEGRATION_DISCONNECTED" },
    { pattern: /^\/integrations\/\w+\/sync$/, method: "POST", action: "INTEGRATION_SYNCED" },
    // Phone verification
    { pattern: /^\/phone\/send-code$/, method: "POST", action: "PHONE_CODE_SENT" },
    { pattern: /^\/phone\/verify$/, method: "POST", action: "PHONE_VERIFIED" },
    { pattern: /^\/phone$/, method: "DELETE", action: "PHONE_REMOVED" },
    // Webhooks
    { pattern: /^\/paddle\/webhook$/, method: "POST", action: "PADDLE_WEBHOOK" },
    { pattern: /^\/webhooks\/strava$/, method: "POST", action: "STRAVA_WEBHOOK" },
    { pattern: /^\/webhooks\/twilio\/incoming$/, method: "POST", action: "TWILIO_WEBHOOK" },
];

// Categorize a route into a human-readable action
export function categorizeAction(method: string, path: string): string {
    // Strip /api prefix if present
    const cleanPath = path.replace(/^\/api/, "");

    for (const entry of ACTION_MAP) {
        if (entry.method === method && entry.pattern.test(cleanPath)) {
            return entry.action;
        }
    }

    // Fallback: generate action from method + first path segment
    const segment = cleanPath.split("/").filter(Boolean)[0] || "unknown";
    return `${method}_${segment.toUpperCase().replace(/-/g, "_")}`;
}

// Extract user info from request JWT (cookie or header)
export function extractUserFromRequest(req: Request): { userId: number | null; userEmail: string | null } {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
        if (cookies?.auth_token) {
            token = cookies.auth_token;
        }
    }

    if (!token) {
        return { userId: null, userEmail: null };
    }

    const decoded = verifyToken(token);
    return decoded
        ? { userId: decoded.userId, userEmail: decoded.email }
        : { userId: null, userEmail: null };
}

// Fire-and-forget log insert - never throws, never blocks
export function logToDb(entry: LogEntry): void {
    getPool().then(pool => {
        if (!pool) return;
        pool.query(
            `INSERT INTO system_logs
                (level, action, message, user_id, user_email, method, endpoint,
                 status_code, duration_ms, error_stack, metadata, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                entry.level,
                entry.action,
                entry.message,
                entry.userId ?? null,
                entry.userEmail ?? null,
                entry.method ?? null,
                entry.endpoint ?? null,
                entry.statusCode ?? null,
                entry.durationMs ?? null,
                entry.errorStack ?? null,
                entry.metadata ? JSON.stringify(entry.metadata) : null,
                entry.ipAddress ?? null,
            ]
        ).catch(err => {
            console.error("[Logger] Failed to write log:", err);
        });
    }).catch(err => {
        console.error("[Logger] Failed to get pool:", err);
    });
}
