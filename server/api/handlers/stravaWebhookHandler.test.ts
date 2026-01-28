import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleWebhookValidation,
    handleWebhookEvent,
    handleCreateSubscription,
    handleViewSubscription,
    handleDeleteSubscription,
    ensureWebhookSubscription
} from "./stravaWebhookHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

// Mock environment variables
const originalEnv = process.env;

import getPool from "../../db/connection.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("stravaWebhookHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset environment
        process.env = {
            ...originalEnv,
            STRAVA_WEBHOOK_VERIFY_TOKEN: "test_verify_token",
            STRAVA_CLIENT_ID: "test_client_id",
            STRAVA_CLIENT_SECRET: "test_client_secret"
        };

        mockPool = {
            query: vi.fn()
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(mockPool);

        mockRequest = {
            body: {},
            query: {},
            params: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis()
        };
    });

    describe("handleWebhookValidation", () => {
        it("should echo challenge for valid validation request", async () => {
            mockRequest.query = {
                "hub.mode": "subscribe",
                "hub.challenge": "test_challenge_123",
                "hub.verify_token": "test_verify_token"
            };

            await handleWebhookValidation(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                "hub.challenge": "test_challenge_123"
            });
        });

        it("should return 400 for invalid hub.mode", async () => {
            mockRequest.query = {
                "hub.mode": "invalid",
                "hub.challenge": "test_challenge",
                "hub.verify_token": "test_verify_token"
            };

            await handleWebhookValidation(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid mode"
            });
        });

        it("should return 403 for invalid verify token", async () => {
            mockRequest.query = {
                "hub.mode": "subscribe",
                "hub.challenge": "test_challenge",
                "hub.verify_token": "wrong_token"
            };

            await handleWebhookValidation(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid verify token"
            });
        });

        it("should return 500 if verify token not configured", async () => {
            process.env.STRAVA_WEBHOOK_VERIFY_TOKEN = "";

            mockRequest.query = {
                "hub.mode": "subscribe",
                "hub.challenge": "test_challenge",
                "hub.verify_token": "any_token"
            };

            await handleWebhookValidation(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Webhook not configured"
            });
        });
    });

    describe("handleWebhookEvent", () => {
        it("should respond 200 immediately and queue event", async () => {
            mockRequest.body = {
                object_type: "activity",
                object_id: 12345,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: 1234567890
            };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleWebhookEvent(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith("EVENT_RECEIVED");
        });

        it("should insert event into database", async () => {
            mockRequest.body = {
                object_type: "activity",
                object_id: 12345,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: 1234567890,
                updates: { title: "New Activity" }
            };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleWebhookEvent(mockRequest as Request, mockResponse as Response);

            // Give async code time to execute
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO strava_webhook_events"),
                expect.arrayContaining([
                    "activity",
                    12345,
                    "create",
                    67890,
                    111,
                    expect.any(Date),
                    expect.any(String)
                ])
            );
        });
    });

    describe("handleCreateSubscription", () => {
        it("should create subscription successfully", async () => {
            mockRequest.body = {
                callback_url: "https://example.com/webhooks/strava"
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ id: 123 })
            });

            await handleCreateSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://www.strava.com/api/v3/push_subscriptions",
                expect.objectContaining({
                    method: "POST"
                })
            );
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                subscriptionId: 123
            });
        });

        it("should return 400 if callback_url missing", async () => {
            mockRequest.body = {};

            await handleCreateSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "callback_url is required"
            });
        });

        it("should return 500 if Strava credentials not configured", async () => {
            process.env.STRAVA_CLIENT_ID = "";

            mockRequest.body = {
                callback_url: "https://example.com/webhooks/strava"
            };

            await handleCreateSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Strava credentials not configured"
            });
        });

        it("should handle Strava API errors", async () => {
            mockRequest.body = {
                callback_url: "https://example.com/webhooks/strava"
            };

            mockFetch.mockResolvedValue({
                ok: false,
                status: 400,
                text: () => Promise.resolve("Bad request")
            });

            await handleCreateSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Failed to create subscription",
                details: "Bad request"
            });
        });
    });

    describe("handleViewSubscription", () => {
        it("should return subscription details", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ id: 123, callback_url: "https://example.com" }])
            });

            await handleViewSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                subscriptions: [{ id: 123, callback_url: "https://example.com" }]
            });
        });

        it("should return 500 if credentials not configured", async () => {
            process.env.STRAVA_CLIENT_ID = "";

            await handleViewSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
        });
    });

    describe("handleDeleteSubscription", () => {
        it("should delete subscription successfully", async () => {
            mockRequest.params = { id: "123" };

            mockFetch.mockResolvedValue({
                ok: true,
                status: 204
            });

            await handleDeleteSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Subscription deleted"
            });
        });

        it("should return 400 if subscription_id missing", async () => {
            mockRequest.params = {};
            mockRequest.body = {};

            await handleDeleteSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "subscription_id is required"
            });
        });

        it("should accept subscription_id from body", async () => {
            mockRequest.params = {};
            mockRequest.body = { subscription_id: "456" };

            mockFetch.mockResolvedValue({
                ok: true,
                status: 204
            });

            await handleDeleteSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("/456?"),
                expect.objectContaining({ method: "DELETE" })
            );
        });
    });

    describe("ensureWebhookSubscription", () => {
        it("should skip if credentials not configured", async () => {
            process.env.STRAVA_CLIENT_ID = "";

            await ensureWebhookSubscription();

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("should skip if subscription already exists", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ id: 123, callback_url: "https://nobull.fit/api/webhooks/strava" }])
            });

            await ensureWebhookSubscription();

            // Should only call GET to check, not POST to create
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining("push_subscriptions?"),
                expect.objectContaining({ method: "GET" })
            );
        });

        it("should create subscription if none exists", async () => {
            // First call: check subscriptions (returns empty array)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });
            // Second call: create subscription
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 456 })
            });

            await ensureWebhookSubscription();

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenNthCalledWith(2,
                "https://www.strava.com/api/v3/push_subscriptions",
                expect.objectContaining({ method: "POST" })
            );
        });

        it("should handle check subscription failure gracefully", async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                text: () => Promise.resolve("Unauthorized")
            });

            // Should not throw
            await ensureWebhookSubscription();

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it("should handle create subscription failure gracefully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });
            mockFetch.mockResolvedValueOnce({
                ok: false,
                text: () => Promise.resolve("Bad request")
            });

            // Should not throw
            await ensureWebhookSubscription();

            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });
});
