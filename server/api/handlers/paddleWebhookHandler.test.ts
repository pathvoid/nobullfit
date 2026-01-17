import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handlePaddleWebhook } from "./paddleWebhookHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/paddleService", () => ({
    verifyWebhookSignature: vi.fn()
}));

vi.mock("../utils/emailService", () => ({
    sendSubscriptionActivatedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCanceledEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionPausedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionResumedEmail: vi.fn().mockResolvedValue(undefined),
    sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionScheduledCancellationEmail: vi.fn().mockResolvedValue(undefined),
    sendSubscriptionCancellationRemovedEmail: vi.fn().mockResolvedValue(undefined)
}));

import getPool from "../../db/connection.js";
import { verifyWebhookSignature } from "../utils/paddleService.js";

describe("paddleWebhookHandler", () => {
    let mockRequest: Partial<Request> & { rawBody?: string };
    let mockResponse: Partial<Response>;
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockPool = {
            query: vi.fn()
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(mockPool);

        // Set up environment variables
        process.env.PADDLE_WEBHOOK_SECRET = "test_webhook_secret";

        mockRequest = {
            headers: {},
            rawBody: undefined
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    it("should return 400 if no raw body is available", async () => {
        mockRequest.rawBody = undefined;

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "No raw body" });
    });

    it("should return 500 if webhook secret is not configured", async () => {
        mockRequest.rawBody = JSON.stringify({ event_type: "test" });
        delete process.env.PADDLE_WEBHOOK_SECRET;

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Webhook secret not configured" });
    });

    it("should return 401 if signature verification fails", async () => {
        process.env.PADDLE_WEBHOOK_SECRET = "test_webhook_secret";
        mockRequest.rawBody = JSON.stringify({ event_type: "test" });
        mockRequest.headers = { "paddle-signature": "invalid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(false);

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid signature" });
    });

    it("should handle subscription.activated event and update user", async () => {
        const webhookEvent = {
            event_id: "evt_123",
            event_type: "subscription.activated",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_123",
            data: {
                id: "sub_123",
                status: "active",
                customer_id: "ctm_123"
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        // First call: update subscription, second call: get user for email
        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ email: "test@example.com", full_name: "Test User" }] });

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
        expect(mockPool.query).toHaveBeenCalled();
    });

    it("should handle subscription.canceled event", async () => {
        const webhookEvent = {
            event_id: "evt_124",
            event_type: "subscription.canceled",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_124",
            data: {
                id: "sub_123",
                status: "canceled",
                customer_id: "ctm_123",
                scheduled_change: null
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ email: "test@example.com", full_name: "Test User" }] });

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("should handle subscription.paused event", async () => {
        const webhookEvent = {
            event_id: "evt_125",
            event_type: "subscription.paused",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_125",
            data: {
                id: "sub_123",
                status: "paused",
                customer_id: "ctm_123"
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ email: "test@example.com", full_name: "Test User" }] });

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("should handle subscription.resumed event", async () => {
        const webhookEvent = {
            event_id: "evt_126",
            event_type: "subscription.resumed",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_126",
            data: {
                id: "sub_123",
                status: "active",
                customer_id: "ctm_123"
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockPool.query
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ email: "test@example.com", full_name: "Test User" }] });

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("should handle subscription.updated with scheduled cancellation", async () => {
        const webhookEvent = {
            event_id: "evt_129",
            event_type: "subscription.updated",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_129",
            data: {
                id: "sub_123",
                status: "active",
                customer_id: "ctm_123",
                scheduled_change: {
                    action: "cancel",
                    effective_at: "2024-02-01T00:00:00Z"
                }
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        // First call: get current subscription_ends_at, second call: update, third call: get user for email
        mockPool.query
            .mockResolvedValueOnce({ rows: [{ subscription_ends_at: null }] })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ email: "test@example.com", full_name: "Test User" }] });

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("should handle subscription.updated when cancellation is removed", async () => {
        const webhookEvent = {
            event_id: "evt_130",
            event_type: "subscription.updated",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_130",
            data: {
                id: "sub_123",
                status: "active",
                customer_id: "ctm_123",
                scheduled_change: null
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        // First call: get current subscription_ends_at (was set), second call: update, third call: get user for email
        mockPool.query
            .mockResolvedValueOnce({ rows: [{ subscription_ends_at: new Date("2024-02-01") }] })
            .mockResolvedValueOnce({ rowCount: 1 })
            .mockResolvedValueOnce({ rows: [{ email: "test@example.com", full_name: "Test User" }] });

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("should handle unknown event types gracefully", async () => {
        const webhookEvent = {
            event_id: "evt_127",
            event_type: "unknown.event",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_127",
            data: {
                id: "some_id"
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("should still return 200 on processing errors to prevent retries", async () => {
        const webhookEvent = {
            event_id: "evt_128",
            event_type: "subscription.activated",
            occurred_at: "2024-01-01T00:00:00Z",
            notification_id: "ntf_128",
            data: {
                id: "sub_123",
                status: "active",
                customer_id: "ctm_123"
            }
        };

        mockRequest.rawBody = JSON.stringify(webhookEvent);
        mockRequest.headers = { "paddle-signature": "valid_signature" };
        (verifyWebhookSignature as ReturnType<typeof vi.fn>).mockReturnValue(true);
        mockPool.query.mockRejectedValue(new Error("Database error"));

        await handlePaddleWebhook(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ received: true, error: "Processing error" });
    });
});
