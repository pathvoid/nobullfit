import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { getOrCreateCustomer } from "../utils/paddleService.js";

// Helper to extract token from request
function getTokenFromRequest(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
    return cookieToken || undefined;
}

// Save plan selection handler - saves user's chosen plan
export async function handleSelectPlan(req: Request, res: Response): Promise<void> {
    try {
        const token = getTokenFromRequest(req);
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

        // Get database connection
        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // For Pro plan, return checkout data instead of saving directly
        if (plan === "pro") {
            // Get user info for Paddle customer creation
            const userResult = await pool.query(
                `SELECT id, email, full_name, paddle_customer_id, subscribed
                FROM users 
                WHERE id = $1 AND email = $2`,
                [decoded.userId, decoded.email]
            );

            if (userResult.rows.length === 0) {
                res.status(404).json({ error: "User not found" });
                return;
            }

            const user = userResult.rows[0];

            // Check if already subscribed
            if (user.subscribed) {
                res.status(400).json({ error: "You already have an active subscription" });
                return;
            }

            // Get or create Paddle customer
            let customerId = user.paddle_customer_id;
            if (!customerId) {
                customerId = await getOrCreateCustomer(user.email, user.full_name);

                // Save the customer ID
                await pool.query(
                    "UPDATE users SET paddle_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                    [customerId, decoded.userId]
                );
            }

            // Return checkout configuration for Pro plan
            res.status(200).json({
                success: true,
                requiresCheckout: true,
                checkout: {
                    customerId,
                    priceId: process.env.PADDLE_PRICE_ID,
                    email: user.email,
                    clientToken: process.env.PADDLE_CLIENT_TOKEN,
                    environment: process.env.PADDLE_ENVIRONMENT || "sandbox"
                }
            });
            return;
        }

        // For Free plan, save directly
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
