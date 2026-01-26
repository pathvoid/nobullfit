import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleSelectPlan } from "./planHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/paddleService", () => ({
    getOrCreateCustomer: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { getOrCreateCustomer } from "../utils/paddleService.js";

describe("planHandler", () => {
    let mockRequest: Partial<Request>;
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

        mockRequest = {
            body: {},
            headers: {},
            cookies: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    describe("handleSelectPlan", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 401 if token in header", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
        });

        it("should return 401 if token is invalid", async () => {
            mockRequest.headers = { authorization: "Bearer invalid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
        });

        it("should return 400 if plan is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {};

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid plan. Must be 'free' or 'pro'."
            });
        });

        it("should return 400 if plan is invalid", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = { plan: "premium" };

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid plan. Must be 'free' or 'pro'."
            });
        });

        it("should return 500 if database connection fails", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = { plan: "free" };

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available"
            });
        });

        describe("Free plan selection", () => {
            it("should update user plan to free and return success", async () => {
                (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
                const mockUser = {
                    id: 1,
                    email: "test@example.com",
                    full_name: "Test User",
                    plan: "free",
                    subscribed: false
                };
                mockPool.query.mockResolvedValue({ rows: [mockUser] });

                mockRequest.headers = { authorization: "Bearer valid_token" };
                mockRequest.body = { plan: "free" };

                await handleSelectPlan(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    user: mockUser,
                    redirect: "/dashboard"
                });
            });

            it("should return 404 if user not found when selecting free plan", async () => {
                (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
                mockPool.query.mockResolvedValue({ rows: [] });

                mockRequest.headers = { authorization: "Bearer valid_token" };
                mockRequest.body = { plan: "free" };

                await handleSelectPlan(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({ error: "User not found" });
            });
        });

        describe("Pro plan selection", () => {
            it("should return checkout data for pro plan", async () => {
                (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
                const mockUser = {
                    id: 1,
                    email: "test@example.com",
                    full_name: "Test User",
                    paddle_customer_id: null,
                    subscribed: false
                };
                mockPool.query.mockResolvedValue({ rows: [mockUser] });
                (getOrCreateCustomer as ReturnType<typeof vi.fn>).mockResolvedValue("cus_123");

                // Mock environment variables
                const originalEnv = process.env;
                process.env = {
                    ...originalEnv,
                    PADDLE_PRICE_ID: "pri_123",
                    PADDLE_CLIENT_TOKEN: "token_123",
                    PADDLE_ENVIRONMENT: "sandbox"
                };

                mockRequest.headers = { authorization: "Bearer valid_token" };
                mockRequest.body = { plan: "pro" };

                await handleSelectPlan(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(200);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    requiresCheckout: true,
                    checkout: {
                        customerId: "cus_123",
                        priceId: "pri_123",
                        email: "test@example.com",
                        clientToken: "token_123",
                        environment: "sandbox"
                    }
                });

                // Restore environment
                process.env = originalEnv;
            });

            it("should return 404 if user not found when selecting pro plan", async () => {
                (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
                mockPool.query.mockResolvedValue({ rows: [] });

                mockRequest.headers = { authorization: "Bearer valid_token" };
                mockRequest.body = { plan: "pro" };

                await handleSelectPlan(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(404);
                expect(mockResponse.json).toHaveBeenCalledWith({ error: "User not found" });
            });

            it("should return 400 if user already has active subscription", async () => {
                (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
                const mockUser = {
                    id: 1,
                    email: "test@example.com",
                    full_name: "Test User",
                    paddle_customer_id: "cus_123",
                    subscribed: true
                };
                mockPool.query.mockResolvedValue({ rows: [mockUser] });

                mockRequest.headers = { authorization: "Bearer valid_token" };
                mockRequest.body = { plan: "pro" };

                await handleSelectPlan(mockRequest as Request, mockResponse as Response);

                expect(mockResponse.status).toHaveBeenCalledWith(400);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "You already have an active subscription"
                });
            });

            it("should use existing paddle customer id if available", async () => {
                (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
                const mockUser = {
                    id: 1,
                    email: "test@example.com",
                    full_name: "Test User",
                    paddle_customer_id: "existing_cus_123",
                    subscribed: false
                };
                mockPool.query.mockResolvedValue({ rows: [mockUser] });

                const originalEnv = process.env;
                process.env = {
                    ...originalEnv,
                    PADDLE_PRICE_ID: "pri_123",
                    PADDLE_CLIENT_TOKEN: "token_123",
                    PADDLE_ENVIRONMENT: "sandbox"
                };

                mockRequest.headers = { authorization: "Bearer valid_token" };
                mockRequest.body = { plan: "pro" };

                await handleSelectPlan(mockRequest as Request, mockResponse as Response);

                // Should not call getOrCreateCustomer since customer already exists
                expect(getOrCreateCustomer).not.toHaveBeenCalled();
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        checkout: expect.objectContaining({
                            customerId: "existing_cus_123"
                        })
                    })
                );

                process.env = originalEnv;
            });
        });

        it("should accept token from cookie", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            const mockUser = {
                id: 1,
                email: "test@example.com",
                full_name: "Test User",
                plan: "free",
                subscribed: false
            };
            mockPool.query.mockResolvedValue({ rows: [mockUser] });

            mockRequest.cookies = { auth_token: "valid_token" };
            mockRequest.body = { plan: "free" };

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(verifyToken).toHaveBeenCalledWith("valid_token");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should return 500 on unexpected error", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockPool.query.mockRejectedValue(new Error("Unexpected database error"));

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = { plan: "free" };

            await handleSelectPlan(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "An error occurred while saving your plan selection."
            });
        });
    });
});
