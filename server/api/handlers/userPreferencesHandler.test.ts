import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetUserPreferences, handleUpdateUserPreferences } from "./userPreferencesHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("userPreferencesHandler", () => {
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
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });

        mockRequest = {
            body: {},
            headers: { authorization: "Bearer test-token" },
            cookies: {},
            params: {},
            query: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    describe("handleGetUserPreferences", () => {
        it("should return 401 when not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 when database is not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleGetUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });

        it("should return defaults when user has no settings", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ quick_add_days: 30 });
        });

        it("should return user settings when they exist", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ quick_add_days: 60 }] });

            await handleGetUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ quick_add_days: 60 });
        });

        it("should handle database errors gracefully", async () => {
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            await handleGetUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });
    });

    describe("handleUpdateUserPreferences", () => {
        it("should return 401 when not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleUpdateUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 when database is not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleUpdateUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });

        it("should return 400 for invalid quick_add_days value", async () => {
            mockRequest.body = { quick_add_days: 45 };

            await handleUpdateUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid quick_add_days value. Must be 30, 60, 90, 120, or 0 (All Time)."
            });
        });

        it("should update preferences successfully with valid quick_add_days", async () => {
            mockRequest.body = { quick_add_days: 60 };
            mockPool.query.mockResolvedValueOnce({ rows: [{ quick_add_days: 60 }] });

            await handleUpdateUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Preferences updated successfully",
                quick_add_days: 60
            });
        });

        it("should accept 0 (All Time) as valid quick_add_days value", async () => {
            mockRequest.body = { quick_add_days: 0 };
            mockPool.query.mockResolvedValueOnce({ rows: [{ quick_add_days: 0 }] });

            await handleUpdateUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Preferences updated successfully",
                quick_add_days: 0
            });
        });

        it("should handle database errors gracefully", async () => {
            mockRequest.body = { quick_add_days: 30 };
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            await handleUpdateUserPreferences(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });
    });
});
