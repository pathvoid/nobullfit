import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import {
    getOrCreateCustomer,
    getSubscription,
    createPortalSession,
    formatPaddleAmount,
    listCustomerSubscriptions
} from "../utils/paddleService.js";

// Helper to extract token from request
function getTokenFromRequest(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.substring(7);
    }
    const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
    return cookieToken || undefined;
}

// Get current subscription status
export async function handleGetSubscription(req: Request, res: Response): Promise<void> {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user subscription info
        const result = await pool.query(
            `SELECT 
                plan, 
                subscribed, 
                subscribed_at,
                paddle_customer_id,
                paddle_subscription_id,
                subscription_status,
                subscription_ends_at,
                subscription_canceled_at
            FROM users 
            WHERE id = $1 AND email = $2`,
            [decoded.userId, decoded.email]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const user = result.rows[0];
        let subscriptionDetails = null;

        // If user has an active Paddle subscription, fetch details
        if (user.paddle_subscription_id && user.subscription_status !== "canceled") {
            const paddleSubscription = await getSubscription(user.paddle_subscription_id);
            if (paddleSubscription) {
                const item = paddleSubscription.items[0];
                subscriptionDetails = {
                    id: paddleSubscription.id,
                    status: paddleSubscription.status,
                    nextBilledAt: paddleSubscription.next_billed_at,
                    currentPeriod: paddleSubscription.current_billing_period,
                    scheduledChange: paddleSubscription.scheduled_change,
                    price: item ? {
                        amount: formatPaddleAmount(
                            item.price.unit_price.amount,
                            item.price.unit_price.currency_code
                        ),
                        interval: item.price.billing_cycle.interval,
                        frequency: item.price.billing_cycle.frequency
                    } : null
                };
            }
        }

        res.status(200).json({
            plan: user.plan || "free",
            subscribed: user.subscribed,
            subscribedAt: user.subscribed_at,
            subscriptionStatus: user.subscription_status,
            subscriptionEndsAt: user.subscription_ends_at,
            subscriptionCanceledAt: user.subscription_canceled_at,
            subscription: subscriptionDetails
        });
    } catch (error) {
        console.error("Get subscription error:", error);
        res.status(500).json({ error: "Failed to get subscription details" });
    }
}

// Create customer portal session
export async function handleCreatePortalSession(req: Request, res: Response): Promise<void> {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user's Paddle customer ID
        const result = await pool.query(
            `SELECT paddle_customer_id, paddle_subscription_id, email, full_name
            FROM users 
            WHERE id = $1 AND email = $2`,
            [decoded.userId, decoded.email]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const user = result.rows[0];
        let customerId = user.paddle_customer_id;

        // If user doesn't have a Paddle customer ID, create one
        if (!customerId) {
            customerId = await getOrCreateCustomer(user.email, user.full_name);

            // Save the customer ID to the user
            await pool.query(
                "UPDATE users SET paddle_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [customerId, decoded.userId]
            );
        }

        // Create portal session
        const subscriptionIds = user.paddle_subscription_id ? [user.paddle_subscription_id] : undefined;
        const portalUrl = await createPortalSession(customerId, subscriptionIds);

        res.status(200).json({ url: portalUrl });
    } catch (error) {
        console.error("Create portal session error:", error);
        res.status(500).json({ error: "Failed to create portal session" });
    }
}

// Initialize checkout - creates/gets Paddle customer and returns checkout data
export async function handleInitCheckout(req: Request, res: Response): Promise<void> {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user info
        const result = await pool.query(
            `SELECT id, email, full_name, paddle_customer_id, subscribed
            FROM users 
            WHERE id = $1 AND email = $2`,
            [decoded.userId, decoded.email]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const user = result.rows[0];

        // Check if already subscribed
        if (user.subscribed) {
            res.status(400).json({ error: "User already has an active subscription" });
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

        // Return checkout configuration
        res.status(200).json({
            customerId,
            priceId: process.env.PADDLE_PRICE_ID,
            email: user.email,
            clientToken: process.env.PADDLE_CLIENT_TOKEN,
            environment: process.env.PADDLE_ENVIRONMENT || "sandbox"
        });
    } catch (error) {
        console.error("Init checkout error:", error);
        res.status(500).json({ error: "Failed to initialize checkout" });
    }
}

// Sync subscription status with Paddle - fallback for when webhooks aren't received
export async function handleSyncSubscription(req: Request, res: Response): Promise<void> {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user info
        const result = await pool.query(
            `SELECT id, paddle_customer_id, paddle_subscription_id, subscribed
            FROM users 
            WHERE id = $1 AND email = $2`,
            [decoded.userId, decoded.email]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        const user = result.rows[0];

        if (!user.paddle_customer_id) {
            res.status(200).json({ synced: false, message: "No Paddle customer ID" });
            return;
        }

        // List active subscriptions for this customer
        const subscriptions = await listCustomerSubscriptions(user.paddle_customer_id);

        if (subscriptions.length === 0) {
            // No active subscriptions found
            if (user.subscribed) {
                // User was subscribed but no longer has active subscription
                await pool.query(
                    `UPDATE users SET 
                        subscribed = false, 
                        plan = 'free',
                        subscription_status = 'canceled',
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $1`,
                    [decoded.userId]
                );
            }
            res.status(200).json({ synced: true, hasActiveSubscription: false });
            return;
        }

        // Found active subscription - update the database
        const activeSubscription = subscriptions[0];
        const updateQuery = `
            UPDATE users SET 
                paddle_subscription_id = $1,
                subscription_status = $2,
                subscribed = true,
                plan = 'pro',
                subscribed_at = COALESCE(subscribed_at, CURRENT_TIMESTAMP),
                plan_selected_at = COALESCE(plan_selected_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
        `;

        await pool.query(updateQuery, [
            activeSubscription.id,
            activeSubscription.status,
            decoded.userId
        ]);

        res.status(200).json({
            synced: true,
            hasActiveSubscription: true,
            subscriptionId: activeSubscription.id,
            status: activeSubscription.status
        });
    } catch (error) {
        console.error("Sync subscription error:", error);
        res.status(500).json({ error: "Failed to sync subscription" });
    }
}

// Get Paddle config for client-side initialization
export async function handleGetPaddleConfig(req: Request, res: Response): Promise<void> {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        res.json({
            clientToken: process.env.PADDLE_CLIENT_TOKEN,
            environment: process.env.PADDLE_ENVIRONMENT || "sandbox"
        });
    } catch (error) {
        console.error("Get Paddle config error:", error);
        res.status(500).json({ error: "Failed to get Paddle config" });
    }
}
