import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetSubscription, handleCreatePortalSession, handleInitCheckout } from "./billingHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/paddleService", () => ({
    getSubscription: vi.fn(),
    createPortalSession: vi.fn(),
    getOrCreateCustomer: vi.fn(),
    formatPaddleAmount: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { getSubscription, createPortalSession, getOrCreateCustomer } from "../utils/paddleService.js";

describe("billingHandler", () => {
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

        // Default environment variables
        process.env.PADDLE_PRICE_ID = "pri_test123";
        process.env.PADDLE_CLIENT_TOKEN = "test_token";
        process.env.PADDLE_ENVIRONMENT = "sandbox";
    });

    describe("handleGetSubscription", () => {
        it("should return 401 if no token is provided", async () => {
            await handleGetSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 401 if token is invalid", async () => {
            mockRequest.headers = { authorization: "Bearer invalid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

            await handleGetSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
        });

        it("should return subscription data for free user", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            
            const mockUser = {
                plan: "free",
                subscribed: false,
                subscribed_at: null,
                paddle_customer_id: null,
                paddle_subscription_id: null,
                subscription_status: null,
                subscription_ends_at: null,
                subscription_canceled_at: null
            };
            mockPool.query.mockResolvedValue({ rows: [mockUser] });

            await handleGetSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                plan: "free",
                subscribed: false,
                subscribedAt: null,
                subscriptionStatus: null,
                subscriptionEndsAt: null,
                subscriptionCanceledAt: null,
                subscription: null
            });
        });

        it("should return 404 if user not found", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetSubscription(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "User not found" });
        });
    });

    describe("handleCreatePortalSession", () => {
        it("should return 401 if no token is provided", async () => {
            await handleCreatePortalSession(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should create portal session for user with existing Paddle customer", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            
            const mockUser = {
                paddle_customer_id: "ctm_123",
                paddle_subscription_id: "sub_123",
                email: "test@example.com",
                full_name: "Test User"
            };
            mockPool.query.mockResolvedValue({ rows: [mockUser] });
            (createPortalSession as ReturnType<typeof vi.fn>).mockResolvedValue("https://portal.paddle.com/session");

            await handleCreatePortalSession(mockRequest as Request, mockResponse as Response);

            expect(createPortalSession).toHaveBeenCalledWith("ctm_123", ["sub_123"]);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ url: "https://portal.paddle.com/session" });
        });

        it("should create new Paddle customer if none exists", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            
            const mockUser = {
                paddle_customer_id: null,
                paddle_subscription_id: null,
                email: "test@example.com",
                full_name: "Test User"
            };
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockUser] })
                .mockResolvedValueOnce({ rows: [] });
            (getOrCreateCustomer as ReturnType<typeof vi.fn>).mockResolvedValue("ctm_new123");
            (createPortalSession as ReturnType<typeof vi.fn>).mockResolvedValue("https://portal.paddle.com/session");

            await handleCreatePortalSession(mockRequest as Request, mockResponse as Response);

            expect(getOrCreateCustomer).toHaveBeenCalledWith("test@example.com", "Test User");
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE users SET paddle_customer_id"),
                ["ctm_new123", 1]
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe("handleInitCheckout", () => {
        it("should return 401 if no token is provided", async () => {
            await handleInitCheckout(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return checkout data for eligible user", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            
            const mockUser = {
                id: 1,
                email: "test@example.com",
                full_name: "Test User",
                paddle_customer_id: "ctm_123",
                subscribed: false
            };
            mockPool.query.mockResolvedValue({ rows: [mockUser] });

            await handleInitCheckout(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                customerId: "ctm_123",
                priceId: "pri_test123",
                email: "test@example.com",
                clientToken: "test_token",
                environment: "sandbox"
            });
        });

        it("should return error if user already has active subscription", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            
            const mockUser = {
                id: 1,
                email: "test@example.com",
                full_name: "Test User",
                paddle_customer_id: "ctm_123",
                subscribed: true
            };
            mockPool.query.mockResolvedValue({ rows: [mockUser] });

            await handleInitCheckout(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "User already has an active subscription" });
        });

        it("should create new Paddle customer if none exists", async () => {
            mockRequest.headers = { authorization: "Bearer valid_token" };
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            
            const mockUser = {
                id: 1,
                email: "test@example.com",
                full_name: "Test User",
                paddle_customer_id: null,
                subscribed: false
            };
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockUser] })
                .mockResolvedValueOnce({ rows: [] });
            (getOrCreateCustomer as ReturnType<typeof vi.fn>).mockResolvedValue("ctm_new123");

            await handleInitCheckout(mockRequest as Request, mockResponse as Response);

            expect(getOrCreateCustomer).toHaveBeenCalledWith("test@example.com", "Test User");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                customerId: "ctm_new123",
                priceId: "pri_test123",
                email: "test@example.com",
                clientToken: "test_token",
                environment: "sandbox"
            });
        });
    });
});
