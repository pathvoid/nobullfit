import type { Request, Response } from "express";
import getAdminPool from "../../db/adminConnection.js";
import {
    getTopQueries,
    getTopPages,
    getOverallPerformance,
    getDeviceBreakdown,
} from "../utils/searchConsoleService.js";

// Period to SQL interval mapping
const PERIOD_MAP: Record<string, string> = {
    "7d": "7 days",
    "28d": "28 days",
    "90d": "90 days",
};

// Format date as YYYY-MM-DD for Search Console API
function formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

// Get analytics data combining internal metrics and Search Console (dev-only)
export async function handleGetAdminAnalytics(req: Request, res: Response): Promise<void> {
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({ error: "Not found" });
        return;
    }

    try {
        const period = (req.query.period as string) || "28d";
        const interval = PERIOD_MAP[period] || PERIOD_MAP["28d"];

        const pool = await getAdminPool();
        if (!pool) {
            res.status(500).json({ error: "Admin database connection not available" });
            return;
        }

        // Calculate date range for Search Console
        const endDate = new Date();
        const startDate = new Date();
        const days = parseInt(interval.split(" ")[0]);
        startDate.setDate(startDate.getDate() - days);

        // Run all queries in parallel
        const [
            topEndpointsResult,
            topActionsResult,
            errorRateResult,
            dailyRequestsResult,
            userSignupsResult,
            activeUsersResult,
            scTopQueries,
            scTopPages,
            scOverall,
            scDevices,
        ] = await Promise.all([
            // Top endpoints by request count
            pool.query(
                `SELECT endpoint, COUNT(*) as count, ROUND(AVG(duration_ms)) as avg_duration_ms
                 FROM system_logs
                 WHERE created_at >= NOW() - $1::interval
                   AND endpoint IS NOT NULL
                 GROUP BY endpoint
                 ORDER BY count DESC
                 LIMIT 20`,
                [interval]
            ),
            // Top actions by count
            pool.query(
                `SELECT action, COUNT(*) as count
                 FROM system_logs
                 WHERE created_at >= NOW() - $1::interval
                 GROUP BY action
                 ORDER BY count DESC
                 LIMIT 20`,
                [interval]
            ),
            // Error rate
            pool.query(
                `SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE level = 'error') as errors
                 FROM system_logs
                 WHERE created_at >= NOW() - $1::interval`,
                [interval]
            ),
            // Daily request counts
            pool.query(
                `SELECT created_at::date as date, COUNT(*) as count
                 FROM system_logs
                 WHERE created_at >= NOW() - $1::interval
                 GROUP BY created_at::date
                 ORDER BY date ASC`,
                [interval]
            ),
            // Daily user signups
            pool.query(
                `SELECT created_at::date as date, COUNT(*) as count
                 FROM users
                 WHERE created_at >= NOW() - $1::interval
                 GROUP BY created_at::date
                 ORDER BY date ASC`,
                [interval]
            ),
            // Active users (distinct user_ids in logs)
            pool.query(
                `SELECT COUNT(DISTINCT user_id) as active_users
                 FROM system_logs
                 WHERE created_at >= NOW() - $1::interval
                   AND user_id IS NOT NULL`,
                [interval]
            ),
            // Search Console queries (run in parallel)
            getTopQueries(formatDate(startDate), formatDate(endDate), 20),
            getTopPages(formatDate(startDate), formatDate(endDate), 20),
            getOverallPerformance(formatDate(startDate), formatDate(endDate)),
            getDeviceBreakdown(formatDate(startDate), formatDate(endDate)),
        ]);

        const totalRequests = parseInt(String(errorRateResult.rows[0]?.total)) || 0;
        const totalErrors = parseInt(String(errorRateResult.rows[0]?.errors)) || 0;

        // Build Search Console section (null if not configured)
        const searchConsole = scOverall !== null ? {
            topQueries: scTopQueries || [],
            topPages: scTopPages || [],
            overall: scOverall,
            devices: scDevices || [],
        } : null;

        res.status(200).json({
            internal: {
                topEndpoints: topEndpointsResult.rows,
                topActions: topActionsResult.rows,
                errorRate: {
                    total: totalRequests,
                    errors: totalErrors,
                    rate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : "0.00",
                },
                dailyRequests: dailyRequestsResult.rows,
                userSignups: userSignupsResult.rows,
                activeUsers: parseInt(String(activeUsersResult.rows[0]?.active_users)) || 0,
            },
            searchConsole,
        });
    } catch (error) {
        console.error("Error fetching admin analytics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
