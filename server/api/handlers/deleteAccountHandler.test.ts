import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleDeleteAccount } from "./deleteAccountHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/paddleService", () => ({
    cancelAllCustomerSubscriptions: vi.fn().mockResolvedValue(true)
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";
import { cancelAllCustomerSubscriptions } from "../utils/paddleService.js";

vi.mock("bcryptjs", () => ({
    default: {
        compare: vi.fn()
    }
}));

describe("deleteAccountHandler", () => {
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
            json: vi.fn().mockReturnThis(),
            clearCookie: vi.fn().mockReturnThis()
        };
    });

    it("should delete account successfully", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {
            password: "correctpassword"
        };

        const mockUser = {
            password_hash: "hashed_password",
            paddle_customer_id: "ctm_123456"
        };

        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        mockPool.query
            .mockResolvedValueOnce({ rows: [mockUser] })
            .mockResolvedValueOnce({ rows: [] });

        await handleDeleteAccount(mockRequest as Request, mockResponse as Response);

        expect(bcrypt.compare).toHaveBeenCalledWith("correctpassword", "hashed_password");
        expect(cancelAllCustomerSubscriptions).toHaveBeenCalledWith("ctm_123456");
        expect(mockPool.query).toHaveBeenCalledWith(
            "DELETE FROM users WHERE id = $1",
            [1]
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should delete account successfully without Paddle customer", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {
            password: "correctpassword"
        };

        const mockUser = {
            password_hash: "hashed_password",
            paddle_customer_id: null
        };

        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (cancelAllCustomerSubscriptions as ReturnType<typeof vi.fn>).mockClear();
        mockPool.query
            .mockResolvedValueOnce({ rows: [mockUser] })
            .mockResolvedValueOnce({ rows: [] });

        await handleDeleteAccount(mockRequest as Request, mockResponse as Response);

        expect(cancelAllCustomerSubscriptions).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should return 401 if password is incorrect", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {
            password: "wrongpassword"
        };

        const mockUser = {
            password_hash: "hashed_password"
        };

        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        mockPool.query.mockResolvedValue({ rows: [mockUser] });

        await handleDeleteAccount(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Incorrect password. Account deletion cancelled."
        });
    });

    it("should return 401 if not authenticated", async () => {
        mockRequest.headers = {};
        mockRequest.cookies = {};

        await handleDeleteAccount(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Authentication required."
        });
    });

    it("should return 400 if password is missing", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {};

        await handleDeleteAccount(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Password is required to confirm account deletion."
        });
    });
});
