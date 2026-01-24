import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyWebhookSignature, type PaddleWebhookEvent } from "../utils/paddleService.js";
import {
    sendSubscriptionActivatedEmail,
    sendSubscriptionCanceledEmail,
    sendSubscriptionPausedEmail,
    sendSubscriptionResumedEmail,
    sendPaymentFailedEmail,
    sendSubscriptionScheduledCancellationEmail,
    sendSubscriptionCancellationRemovedEmail
} from "../utils/emailService.js";

// Type for subscription status
type SubscriptionStatus = "active" | "paused" | "past_due" | "canceled" | "trialing";

// Handle Paddle webhook events
export async function handlePaddleWebhook(req: Request, res: Response): Promise<void> {
    try {
        // Get raw body for signature verification
        const rawBody = (req as Request & { rawBody?: string }).rawBody;
        if (!rawBody) {
            console.error("Paddle webhook: No raw body available");
            res.status(400).json({ error: "No raw body" });
            return;
        }

        // Get signature from header
        const signature = req.headers["paddle-signature"] as string | undefined;
        const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error("Paddle webhook: No webhook secret configured");
            res.status(500).json({ error: "Webhook secret not configured" });
            return;
        }

        // Verify webhook signature
        if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
            console.error("Paddle webhook: Invalid signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
        }

        // Parse the webhook event
        const event: PaddleWebhookEvent = JSON.parse(rawBody);

        // Handle different event types
        switch (event.event_type) {
            case "subscription.activated":
                await handleSubscriptionActivated(event);
                break;
            case "subscription.canceled":
                await handleSubscriptionCanceled(event);
                break;
            case "subscription.paused":
                await handleSubscriptionPaused(event);
                break;
            case "subscription.resumed":
                await handleSubscriptionResumed(event);
                break;
            case "subscription.past_due":
                await handleSubscriptionPastDue(event);
                break;
            case "subscription.updated":
                await handleSubscriptionUpdated(event);
                break;
            case "subscription.created":
                await handleSubscriptionCreated(event);
                break;
            case "subscription.trialing":
                await handleSubscriptionTrialing(event);
                break;
            default:
                // Unhandled event type - ignore silently
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (error) {
        console.error("Paddle webhook error:", error);
        // Still respond with 200 to prevent Paddle from retrying
        res.status(200).json({ received: true, error: "Processing error" });
    }
}

// Handle subscription.activated event
async function handleSubscriptionActivated(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId, status } = event.data;

    if (!customerId) {
        console.error("Subscription activated: No customer ID");
        return;
    }

    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: status as SubscriptionStatus,
        subscribed: true,
        plan: "pro"
    });

    // Send activation email
    const user = await getUserByPaddleCustomerId(customerId);
    if (user) {
        try {
            await sendSubscriptionActivatedEmail(user.email, user.full_name);
        } catch (emailError) {
            console.error("Failed to send subscription activated email:", emailError);
        }
    }

}

// Handle subscription.created event
async function handleSubscriptionCreated(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId, status } = event.data;

    if (!customerId) {
        console.error("Subscription created: No customer ID");
        return;
    }

    // Just save the subscription ID - don't mark as active yet until activated
    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: status as SubscriptionStatus
    });

}

// Handle subscription.trialing event
async function handleSubscriptionTrialing(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId } = event.data;

    if (!customerId) {
        console.error("Subscription trialing: No customer ID");
        return;
    }

    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: "trialing",
        subscribed: true,
        plan: "pro"
    });

}

// Handle subscription.canceled event
async function handleSubscriptionCanceled(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId, scheduled_change } = event.data;

    if (!customerId) {
        console.error("Subscription canceled: No customer ID");
        return;
    }

    // Check if it's a scheduled cancellation or immediate
    const endsAt = scheduled_change?.effective_at
        ? new Date(scheduled_change.effective_at)
        : new Date();

    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: "canceled",
        subscriptionEndsAt: endsAt,
        subscriptionCanceledAt: new Date(),
        subscribed: false,
        plan: "free"
    });

    // Clean up future-dated Pro-only data (food tracking and progress tracking)
    try {
        await cleanupFutureProData(customerId);
    } catch (cleanupError) {
        console.error("Failed to clean up future Pro data:", cleanupError);
    }

    // Disable auto-sync for integrations (Pro-only feature)
    try {
        await disableAutoSyncForUser(customerId);
    } catch (autoSyncError) {
        console.error("Failed to disable auto-sync:", autoSyncError);
    }

    // Send cancellation email
    const user = await getUserByPaddleCustomerId(customerId);
    if (user) {
        try {
            const endDateStr = scheduled_change?.effective_at
                ? new Date(scheduled_change.effective_at).toLocaleDateString("en-US", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                })
                : undefined;
            await sendSubscriptionCanceledEmail(user.email, user.full_name, endDateStr);
        } catch (emailError) {
            console.error("Failed to send subscription canceled email:", emailError);
        }
    }

}

// Handle subscription.paused event
async function handleSubscriptionPaused(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId, scheduled_change } = event.data;

    if (!customerId) {
        console.error("Subscription paused: No customer ID");
        return;
    }

    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: "paused",
        subscribed: false
    });

    // Disable auto-sync for integrations (Pro-only feature)
    try {
        await disableAutoSyncForUser(customerId);
    } catch (autoSyncError) {
        console.error("Failed to disable auto-sync:", autoSyncError);
    }

    // Send paused email
    const user = await getUserByPaddleCustomerId(customerId);
    if (user) {
        try {
            const resumeDateStr = scheduled_change?.effective_at
                ? new Date(scheduled_change.effective_at).toLocaleDateString("en-US", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                })
                : undefined;
            await sendSubscriptionPausedEmail(user.email, user.full_name, resumeDateStr);
        } catch (emailError) {
            console.error("Failed to send subscription paused email:", emailError);
        }
    }

}

// Handle subscription.resumed event
async function handleSubscriptionResumed(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId } = event.data;

    if (!customerId) {
        console.error("Subscription resumed: No customer ID");
        return;
    }

    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
        subscribed: true,
        plan: "pro",
        subscriptionEndsAt: null,
        subscriptionCanceledAt: null
    });

    // Send resumed email
    const user = await getUserByPaddleCustomerId(customerId);
    if (user) {
        try {
            await sendSubscriptionResumedEmail(user.email, user.full_name);
        } catch (emailError) {
            console.error("Failed to send subscription resumed email:", emailError);
        }
    }

}

// Handle subscription.past_due event
async function handleSubscriptionPastDue(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId } = event.data;

    if (!customerId) {
        console.error("Subscription past due: No customer ID");
        return;
    }

    await updateUserSubscription(customerId, {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: "past_due"
    });

    // Send payment failed email
    const user = await getUserByPaddleCustomerId(customerId);
    if (user) {
        try {
            await sendPaymentFailedEmail(user.email, user.full_name);
        } catch (emailError) {
            console.error("Failed to send payment failed email:", emailError);
        }
    }

}

// Handle subscription.updated event
async function handleSubscriptionUpdated(event: PaddleWebhookEvent): Promise<void> {
    const { id: subscriptionId, customer_id: customerId, status, scheduled_change } = event.data;

    if (!customerId) {
        console.error("Subscription updated: No customer ID");
        return;
    }

    // Check if user previously had a scheduled cancellation
    const previousEndDate = await getUserSubscriptionEndDate(customerId);
    const hadScheduledCancellation = previousEndDate !== null;
    const hasNewScheduledCancellation = scheduled_change?.action === "cancel" && scheduled_change.effective_at;

    const updates: UpdateSubscriptionData = {
        paddleSubscriptionId: subscriptionId,
        subscriptionStatus: status as SubscriptionStatus
    };

    // If there's a scheduled cancellation, update the end date
    if (hasNewScheduledCancellation) {
        updates.subscriptionEndsAt = new Date(scheduled_change.effective_at);
    } else if (hadScheduledCancellation && !hasNewScheduledCancellation) {
        // User removed the scheduled cancellation, clear the end date
        updates.subscriptionEndsAt = null;
    }

    await updateUserSubscription(customerId, updates);

    // Send appropriate email based on the change
    // Only send emails if the subscription is still active (not being canceled)
    // When a subscription is canceled immediately, both updated and canceled events are sent
    // We don't want to send "cancellation removed" email if the subscription is actually being canceled
    const user = await getUserByPaddleCustomerId(customerId);
    if (user && status !== "canceled") {
        try {
            if (hasNewScheduledCancellation && !hadScheduledCancellation) {
                // User just scheduled a cancellation
                const endDateStr = new Date(scheduled_change.effective_at).toLocaleDateString("en-US", { 
                    year: "numeric", 
                    month: "long", 
                    day: "numeric" 
                });
                await sendSubscriptionScheduledCancellationEmail(user.email, user.full_name, endDateStr);
            } else if (hadScheduledCancellation && !hasNewScheduledCancellation) {
                // User removed their scheduled cancellation
                await sendSubscriptionCancellationRemovedEmail(user.email, user.full_name);
            }
        } catch (emailError) {
            console.error("Failed to send subscription updated email:", emailError);
        }
    }

}

// Types for update data
interface UpdateSubscriptionData {
    paddleSubscriptionId?: string;
    subscriptionStatus?: SubscriptionStatus;
    subscribed?: boolean;
    plan?: "free" | "pro";
    subscriptionEndsAt?: Date | null;
    subscriptionCanceledAt?: Date | null;
}

// Type for user info
interface UserInfo {
    email: string;
    full_name: string;
}

// Get user info by Paddle customer ID
async function getUserByPaddleCustomerId(paddleCustomerId: string): Promise<UserInfo | null> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database connection not available");
        return null;
    }

    try {
        const result = await pool.query(
            "SELECT email, full_name FROM users WHERE paddle_customer_id = $1",
            [paddleCustomerId]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    } catch (error) {
        console.error("Error getting user by paddle customer ID:", error);
        return null;
    }
}

// Get user's current subscription end date to detect scheduled cancellation changes
async function getUserSubscriptionEndDate(paddleCustomerId: string): Promise<Date | null> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database connection not available");
        return null;
    }

    try {
        const result = await pool.query(
            "SELECT subscription_ends_at FROM users WHERE paddle_customer_id = $1",
            [paddleCustomerId]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0].subscription_ends_at || null;
    } catch (error) {
        console.error("Error getting user subscription end date:", error);
        return null;
    }
}

// Update user subscription in database
async function updateUserSubscription(
    paddleCustomerId: string,
    data: UpdateSubscriptionData
): Promise<void> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database connection not available");
        return;
    }

    // Build dynamic UPDATE query
    const setClauses: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const values: (string | boolean | Date | null)[] = [];
    let paramIndex = 1;

    if (data.paddleSubscriptionId !== undefined) {
        setClauses.push(`paddle_subscription_id = $${paramIndex++}`);
        values.push(data.paddleSubscriptionId);
    }

    if (data.subscriptionStatus !== undefined) {
        setClauses.push(`subscription_status = $${paramIndex++}`);
        values.push(data.subscriptionStatus);
    }

    if (data.subscribed !== undefined) {
        setClauses.push(`subscribed = $${paramIndex++}`);
        values.push(data.subscribed);
        if (data.subscribed) {
            setClauses.push("subscribed_at = CURRENT_TIMESTAMP");
        }
    }

    if (data.plan !== undefined) {
        setClauses.push(`plan = $${paramIndex++}`);
        values.push(data.plan);
        setClauses.push("plan_selected_at = CURRENT_TIMESTAMP");
    }

    if (data.subscriptionEndsAt !== undefined) {
        setClauses.push(`subscription_ends_at = $${paramIndex++}`);
        values.push(data.subscriptionEndsAt);
    }

    if (data.subscriptionCanceledAt !== undefined) {
        setClauses.push(`subscription_canceled_at = $${paramIndex++}`);
        values.push(data.subscriptionCanceledAt);
    }

    // Add paddle_customer_id to WHERE clause
    values.push(paddleCustomerId);

    const query = `
        UPDATE users 
        SET ${setClauses.join(", ")}
        WHERE paddle_customer_id = $${paramIndex}
    `;

    try {
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            console.warn(`No user found with paddle_customer_id: ${paddleCustomerId}`);
        }
    } catch (error) {
        console.error("Error updating user subscription:", error);
        throw error;
    }
}

// Get user ID by Paddle customer ID
async function getUserIdByPaddleCustomerId(paddleCustomerId: string): Promise<number | null> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database connection not available");
        return null;
    }

    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE paddle_customer_id = $1",
            [paddleCustomerId]
        );
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0].id;
    } catch (error) {
        console.error("Error getting user ID by paddle customer ID:", error);
        return null;
    }
}

// Clean up future-dated Pro-only data when subscription is canceled
// This removes future meals from food_tracking and future activities from progress_tracking
// Each entry has its own timezone, so we compare against "today" in that timezone
async function cleanupFutureProData(paddleCustomerId: string): Promise<void> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database connection not available");
        return;
    }

    const userId = await getUserIdByPaddleCustomerId(paddleCustomerId);
    if (!userId) {
        console.warn(`Cannot clean up Pro data: no user found for paddle_customer_id ${paddleCustomerId}`);
        return;
    }

    try {
        // Delete future-dated food tracking entries
        // We use timezone-aware comparison: convert current UTC time to the entry's timezone
        // and compare against the entry's date
        const foodResult = await pool.query(
            `DELETE FROM food_tracking 
             WHERE user_id = $1 
             AND date > (CURRENT_TIMESTAMP AT TIME ZONE timezone)::date`,
            [userId]
        );

        // Delete future-dated progress tracking entries
        const progressResult = await pool.query(
            `DELETE FROM progress_tracking 
             WHERE user_id = $1 
             AND date > (CURRENT_TIMESTAMP AT TIME ZONE timezone)::date`,
            [userId]
        );

        const foodCount = foodResult.rowCount || 0;
        const progressCount = progressResult.rowCount || 0;

    } catch (error) {
        console.error("Error cleaning up future Pro data:", error);
        throw error;
    }
}

// Disable auto-sync for all integrations when subscription is canceled
// Auto-sync is a Pro-only feature
async function disableAutoSyncForUser(paddleCustomerId: string): Promise<void> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database connection not available");
        return;
    }

    const userId = await getUserIdByPaddleCustomerId(paddleCustomerId);
    if (!userId) {
        console.warn(`Cannot disable auto-sync: no user found for paddle_customer_id ${paddleCustomerId}`);
        return;
    }

    try {
        const result = await pool.query(
            `UPDATE integration_auto_sync
             SET is_enabled = false, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND is_enabled = true`,
            [userId]
        );

        if (result.rowCount && result.rowCount > 0) {
            console.log(`Disabled auto-sync for ${result.rowCount} integration(s) for user ${userId}`);
        }
    } catch (error) {
        console.error("Error disabling auto-sync for user:", error);
        throw error;
    }
}
