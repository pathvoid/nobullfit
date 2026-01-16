import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

// Save plan selection handler - saves user's chosen plan
export async function handleSelectPlan(req: Request, res: Response): Promise<void> {
    try {
        // Check for token in Authorization header first
        let token: string | undefined;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            // Fallback to cookie if no Authorization header
            const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
            if (cookieToken) {
                token = cookieToken;
            }
        }

        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const { plan } = req.body;

        // Validate plan value
        if (!plan || !["free", "pro"].includes(plan)) {
            res.status(400).json({ error: "Invalid plan. Must be 'free' or 'pro'." });
            return;
        }

        // Pro plan is not available yet
        if (plan === "pro") {
            res.status(400).json({ error: "Pro plan is not available yet. Please select the Free plan." });
            return;
        }

        // Get database connection
        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Update user's plan
        const result = await pool.query(
            `UPDATE users 
             SET plan = $1, plan_selected_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND email = $3
             RETURNING id, email, full_name, plan, subscribed`,
            [plan, decoded.userId, decoded.email]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.status(200).json({
            success: true,
            user: result.rows[0],
            redirect: "/dashboard"
        });
    } catch (error) {
        console.error("Plan selection error:", error);
        res.status(500).json({ error: "An error occurred while saving your plan selection." });
    }
}
