import type { Request, Response } from "express";
import getAdminPool from "../../db/adminConnection.js";

// Get paginated list of users (dev-only)
export async function handleGetAdminUsers(req: Request, res: Response): Promise<void> {
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
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
        const search = (req.query.search as string || "").trim();
        const offset = (page - 1) * limit;

        let whereClause = "";
        const params: (string | number)[] = [];

        if (search) {
            params.push(`%${search}%`, `%${search}%`);
            whereClause = `WHERE u.full_name ILIKE $1 OR u.email ILIKE $2`;
        }

        // Count total matching users
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM users u ${whereClause}`,
            params
        );
        const total = parseInt(String(countResult.rows[0]?.total)) || 0;

        // Fetch paginated users
        const offsetParamIndex = params.length + 1;
        const limitParamIndex = params.length + 2;
        const usersResult = await pool.query(
            `SELECT
                u.id,
                u.email,
                u.full_name,
                u.plan,
                u.subscribed,
                u.subscribed_at,
                u.paddle_customer_id,
                u.paddle_subscription_id,
                u.subscription_status,
                u.subscription_ends_at,
                u.subscription_canceled_at,
                u.created_at,
                u.updated_at
            FROM users u
            ${whereClause}
            ORDER BY u.created_at DESC
            OFFSET $${offsetParamIndex} LIMIT $${limitParamIndex}`,
            [...params, offset, limit]
        );

        res.status(200).json({
            users: usersResult.rows,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("Error fetching admin users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update a user's details (dev-only)
export async function handleUpdateAdminUser(req: Request, res: Response): Promise<void> {
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

        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

        const {
            email,
            full_name,
            plan,
            subscribed,
            subscription_status,
            subscription_ends_at,
            paddle_customer_id,
            paddle_subscription_id
        } = req.body;

        // Build dynamic SET clause from provided fields
        const setClauses: string[] = [];
        const values: (string | boolean | null)[] = [];
        let paramIndex = 1;

        if (email !== undefined) {
            setClauses.push(`email = $${paramIndex++}`);
            values.push(email);
        }
        if (full_name !== undefined) {
            setClauses.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        if (plan !== undefined) {
            setClauses.push(`plan = $${paramIndex++}`);
            values.push(plan || null);
        }
        if (subscribed !== undefined) {
            setClauses.push(`subscribed = $${paramIndex++}`);
            values.push(subscribed);
        }
        if (subscription_status !== undefined) {
            setClauses.push(`subscription_status = $${paramIndex++}`);
            values.push(subscription_status || null);
        }
        if (subscription_ends_at !== undefined) {
            setClauses.push(`subscription_ends_at = $${paramIndex++}`);
            values.push(subscription_ends_at || null);
        }
        if (paddle_customer_id !== undefined) {
            setClauses.push(`paddle_customer_id = $${paramIndex++}`);
            values.push(paddle_customer_id || null);
        }
        if (paddle_subscription_id !== undefined) {
            setClauses.push(`paddle_subscription_id = $${paramIndex++}`);
            values.push(paddle_subscription_id || null);
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: "No fields to update" });
            return;
        }

        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(String(userId));

        const result = await pool.query(
            `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING
                id, email, full_name, plan, subscribed, subscribed_at,
                paddle_customer_id, paddle_subscription_id, subscription_status,
                subscription_ends_at, subscription_canceled_at, created_at, updated_at`,
            values
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({ user: result.rows[0] });
    } catch (error) {
        console.error("Error updating admin user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
