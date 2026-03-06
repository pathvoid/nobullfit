import type { Request, Response } from "express";
import getAdminPool from "../../db/adminConnection.js";

// Get paginated system logs with filtering (dev-only)
export async function handleGetAdminLogs(req: Request, res: Response): Promise<void> {
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

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 100));
        const offset = (page - 1) * limit;
        const level = (req.query.level as string || "").trim();
        const action = (req.query.action as string || "").trim();
        const search = (req.query.search as string || "").trim();
        const date = (req.query.date as string || "").trim();
        const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

        const conditions: string[] = [];
        const params: (string | number)[] = [];
        let paramIndex = 1;

        if (level) {
            conditions.push(`level = $${paramIndex++}`);
            params.push(level);
        }

        if (action) {
            conditions.push(`action = $${paramIndex++}`);
            params.push(action);
        }

        if (search) {
            conditions.push(`(user_email ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (date) {
            conditions.push(`created_at::date = $${paramIndex++}`);
            params.push(date);
        }

        if (userId !== null && !isNaN(userId)) {
            conditions.push(`user_id = $${paramIndex++}`);
            params.push(userId);
        }

        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        // Get total count
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM system_logs ${whereClause}`,
            params
        );
        const total = parseInt(String(countResult.rows[0]?.total)) || 0;

        // Get distinct actions for filter dropdown
        const actionsResult = await pool.query(
            `SELECT DISTINCT action FROM system_logs ORDER BY action`
        );
        const actions = actionsResult.rows.map((r: { action: string }) => r.action);

        // Fetch paginated logs
        const logsResult = await pool.query(
            `SELECT * FROM system_logs
             ${whereClause}
             ORDER BY created_at DESC
             OFFSET $${paramIndex} LIMIT $${paramIndex + 1}`,
            [...params, offset, limit]
        );

        res.status(200).json({
            logs: logsResult.rows,
            actions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Error fetching admin logs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
