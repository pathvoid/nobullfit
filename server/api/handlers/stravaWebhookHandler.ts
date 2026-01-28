// Strava Webhook Handler
// Handles incoming webhook events from Strava

import type { Request, Response } from "express";
import getPool from "../../db/connection.js";

// Helper functions to get environment variables at runtime
function getWebhookVerifyToken(): string {
    return process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "";
}

function getStravaClientId(): string {
    return process.env.STRAVA_CLIENT_ID || "";
}

function getStravaClientSecret(): string {
    return process.env.STRAVA_CLIENT_SECRET || "";
}

// Strava webhook event interface
interface StravaWebhookEvent {
    object_type: "activity" | "athlete";
    object_id: number;
    aspect_type: "create" | "update" | "delete";
    owner_id: number;
    subscription_id: number;
    event_time: number;
    updates?: Record<string, string>;
}

// Handle webhook validation (GET request from Strava during subscription creation)
export async function handleWebhookValidation(req: Request, res: Response): Promise<void> {
    try {
        const mode = req.query["hub.mode"] as string;
        const challenge = req.query["hub.challenge"] as string;
        const verifyToken = req.query["hub.verify_token"] as string;

        console.log("[Strava Webhook] Validation request received:", { mode, verifyToken });

        // Validate the request
        if (mode !== "subscribe") {
            console.error("[Strava Webhook] Invalid hub.mode:", mode);
            res.status(400).json({ error: "Invalid mode" });
            return;
        }

        if (!getWebhookVerifyToken()) {
            console.error("[Strava Webhook] STRAVA_WEBHOOK_VERIFY_TOKEN not configured");
            res.status(500).json({ error: "Webhook not configured" });
            return;
        }

        if (verifyToken !== getWebhookVerifyToken()) {
            console.error("[Strava Webhook] Invalid verify token");
            res.status(403).json({ error: "Invalid verify token" });
            return;
        }

        // Echo back the challenge to confirm subscription
        console.log("[Strava Webhook] Validation successful, echoing challenge");
        res.status(200).json({ "hub.challenge": challenge });
    } catch (error) {
        console.error("[Strava Webhook] Validation error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Handle incoming webhook events (POST request from Strava)
export async function handleWebhookEvent(req: Request, res: Response): Promise<void> {
    // Respond immediately with 200 OK (Strava requires response within 2 seconds)
    res.status(200).send("EVENT_RECEIVED");

    try {
        const event = req.body as StravaWebhookEvent;

        console.log("[Strava Webhook] Event received:", {
            objectType: event.object_type,
            objectId: event.object_id,
            aspectType: event.aspect_type,
            ownerId: event.owner_id,
            subscriptionId: event.subscription_id
        });

        // Validate event
        if (!event.object_type || !event.object_id || !event.aspect_type || !event.owner_id) {
            console.error("[Strava Webhook] Invalid event format:", event);
            return;
        }

        const pool = await getPool();
        if (!pool) {
            console.error("[Strava Webhook] Database not available");
            return;
        }

        // Store event in queue for async processing
        await pool.query(
            `INSERT INTO strava_webhook_events
             (object_type, object_id, aspect_type, owner_id, subscription_id, event_time, updates)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                event.object_type,
                event.object_id,
                event.aspect_type,
                event.owner_id,
                event.subscription_id,
                new Date(event.event_time * 1000),
                event.updates ? JSON.stringify(event.updates) : null
            ]
        );

        console.log("[Strava Webhook] Event queued for processing");
    } catch (error) {
        // Log but don't fail - we already sent 200 OK
        console.error("[Strava Webhook] Error queueing event:", error);
    }
}

// Create a webhook subscription (admin endpoint)
export async function handleCreateSubscription(req: Request, res: Response): Promise<void> {
    try {
        if (!getStravaClientId() || !getStravaClientSecret()) {
            res.status(500).json({ error: "Strava credentials not configured" });
            return;
        }

        if (!getWebhookVerifyToken()) {
            res.status(500).json({ error: "STRAVA_WEBHOOK_VERIFY_TOKEN not configured" });
            return;
        }

        const callbackUrl = req.body.callback_url as string;
        if (!callbackUrl) {
            res.status(400).json({ error: "callback_url is required" });
            return;
        }

        console.log("[Strava Webhook] Creating subscription with callback:", callbackUrl);

        const response = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: getStravaClientId(),
                client_secret: getStravaClientSecret(),
                callback_url: callbackUrl,
                verify_token: getWebhookVerifyToken()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Strava Webhook] Subscription creation failed:", errorText);
            res.status(response.status).json({
                error: "Failed to create subscription",
                details: errorText
            });
            return;
        }

        const data = await response.json();
        console.log("[Strava Webhook] Subscription created:", data);

        res.status(201).json({
            success: true,
            subscriptionId: data.id
        });
    } catch (error) {
        console.error("[Strava Webhook] Error creating subscription:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// View webhook subscription (admin endpoint)
export async function handleViewSubscription(req: Request, res: Response): Promise<void> {
    try {
        if (!getStravaClientId() || !getStravaClientSecret()) {
            res.status(500).json({ error: "Strava credentials not configured" });
            return;
        }

        const params = new URLSearchParams({
            client_id: getStravaClientId(),
            client_secret: getStravaClientSecret()
        });

        const response = await fetch(
            `https://www.strava.com/api/v3/push_subscriptions?${params.toString()}`,
            { method: "GET" }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Strava Webhook] View subscription failed:", errorText);
            res.status(response.status).json({
                error: "Failed to view subscription",
                details: errorText
            });
            return;
        }

        const data = await response.json();
        res.status(200).json({
            subscriptions: data
        });
    } catch (error) {
        console.error("[Strava Webhook] Error viewing subscription:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Auto-setup webhook subscription on server startup (production only)
export async function ensureWebhookSubscription(): Promise<void> {
    const clientId = getStravaClientId();
    const clientSecret = getStravaClientSecret();
    const verifyToken = getWebhookVerifyToken();

    // Skip if credentials not configured
    if (!clientId || !clientSecret || !verifyToken) {
        console.log("[Strava Webhook] Skipping auto-setup: credentials not configured");
        return;
    }

    try {
        // Check if subscription already exists
        const checkParams = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret
        });

        const checkResponse = await fetch(
            `https://www.strava.com/api/v3/push_subscriptions?${checkParams.toString()}`,
            { method: "GET" }
        );

        if (!checkResponse.ok) {
            console.error("[Strava Webhook] Failed to check existing subscriptions:", await checkResponse.text());
            return;
        }

        const subscriptions = await checkResponse.json();

        if (Array.isArray(subscriptions) && subscriptions.length > 0) {
            console.log("[Strava Webhook] Subscription already exists:", subscriptions[0].id);
            return;
        }

        // Create new subscription
        const callbackUrl = "https://nobull.fit/api/webhooks/strava";
        console.log("[Strava Webhook] Creating subscription with callback:", callbackUrl);

        const createResponse = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                callback_url: callbackUrl,
                verify_token: verifyToken
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error("[Strava Webhook] Auto-setup failed:", errorText);
            return;
        }

        const data = await createResponse.json();
        console.log("[Strava Webhook] Subscription created successfully:", data.id);
    } catch (error) {
        console.error("[Strava Webhook] Auto-setup error:", error);
    }
}

// Delete webhook subscription (admin endpoint)
export async function handleDeleteSubscription(req: Request, res: Response): Promise<void> {
    try {
        if (!getStravaClientId() || !getStravaClientSecret()) {
            res.status(500).json({ error: "Strava credentials not configured" });
            return;
        }

        const subscriptionId = req.params.id || req.body.subscription_id;
        if (!subscriptionId) {
            res.status(400).json({ error: "subscription_id is required" });
            return;
        }

        const params = new URLSearchParams({
            client_id: getStravaClientId(),
            client_secret: getStravaClientSecret()
        });

        const response = await fetch(
            `https://www.strava.com/api/v3/push_subscriptions/${subscriptionId}?${params.toString()}`,
            { method: "DELETE" }
        );

        if (response.status === 204) {
            console.log("[Strava Webhook] Subscription deleted:", subscriptionId);
            res.status(200).json({ success: true, message: "Subscription deleted" });
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Strava Webhook] Delete subscription failed:", errorText);
            res.status(response.status).json({
                error: "Failed to delete subscription",
                details: errorText
            });
            return;
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("[Strava Webhook] Error deleting subscription:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
