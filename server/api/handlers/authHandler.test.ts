import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetMe, handleLogout } from "./authHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("authHandler", () => {
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

    describe("handleGetMe", () => {
        it("should return user data for valid token in Authorization header", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            const mockUser = {
                id: 1,
                email: "test@example.com",
                full_name: "Test User"
            };

            mockPool.query.mockResolvedValue({ rows: [mockUser] });

            await handleGetMe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                user: mockUser
            });
        });

        it("should return user data for valid token in cookie", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.cookies = { auth_token: "valid_token" };

            const mockUser = {
                id: 1,
                email: "test@example.com",
                full_name: "Test User"
            };

            mockPool.query.mockResolvedValue({ rows: [mockUser] });

            await handleGetMe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                user: mockUser
            });
        });

        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetMe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Unauthorized"
            });
        });

        it("should return 401 if token is invalid", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = { authorization: "Bearer invalid_token" };

            await handleGetMe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid or expired token"
            });
        });

        it("should return 401 if user not found in database", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetMe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "User not found"
            });
        });

        it("should return 500 if database connection fails", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleGetMe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available"
            });
        });
    });

    describe("handleLogout", () => {
        it("should clear auth cookie and return success", async () => {
            await handleLogout(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.clearCookie).toHaveBeenCalledWith("auth_token", {
                httpOnly: true,
                secure: false,
                sameSite: "lax"
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true
            });
        });
    });
});
