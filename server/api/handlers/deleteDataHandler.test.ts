import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleDeleteData } from "./deleteDataHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("bcryptjs", () => ({
    default: {
        compare: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";

describe("deleteDataHandler", () => {
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

    describe("handleDeleteData", () => {
        it("should return 503 if database is not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(503);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available. Please try again later."
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Authentication required."
            });
        });

        it("should return 401 if token is invalid", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = { authorization: "Bearer invalid_token" };

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid or expired token."
            });
        });

        it("should return 400 if password is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                timePeriod: "7",
                dataTypes: ["recipes"]
            };

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Password is required to confirm data deletion."
            });
        });

        it("should return 400 if timePeriod is invalid", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "invalid",
                dataTypes: ["recipes"]
            };

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid time period. Must be 7, 30, or all."
            });
        });

        it("should return 400 if dataTypes is empty", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "7",
                dataTypes: []
            };

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "At least one data type must be selected."
            });
        });

        it("should return 404 if user not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "7",
                dataTypes: ["recipes"]
            };

            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "User not found."
            });
        });

        it("should return 401 if password is incorrect", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "wrongpassword",
                timePeriod: "7",
                dataTypes: ["recipes"]
            };

            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, password_hash: "hashed_password" }]
            });

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Incorrect password. Data deletion cancelled."
            });
        });

        it("should delete recipes for last 7 days", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "7",
                dataTypes: ["recipes"]
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: "hashed_password" }] })
                .mockResolvedValueOnce({ rowCount: 3 });

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Selected data has been successfully deleted.",
                deleted: { recipes: 3 }
            });
        });

        it("should delete all data types for all time", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "all",
                dataTypes: ["recipes", "favorites", "grocery_lists", "food_tracking", "progress_tracking", "weight_tracking", "tdee"]
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: "hashed_password" }] })
                .mockResolvedValueOnce({ rowCount: 5 })
                .mockResolvedValueOnce({ rowCount: 10 })
                .mockResolvedValueOnce({ rowCount: 2 })
                .mockResolvedValueOnce({ rowCount: 50 })
                .mockResolvedValueOnce({ rowCount: 20 })
                .mockResolvedValueOnce({ rowCount: 30 })
                .mockResolvedValueOnce({ rowCount: 1 });

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Selected data has been successfully deleted.",
                deleted: {
                    recipes: 5,
                    favorites: 10,
                    grocery_lists: 2,
                    food_tracking: 50,
                    progress_tracking: 20,
                    weight_tracking: 30,
                    tdee: 1
                }
            });
        });

        it("should delete data for last 30 days", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "30",
                dataTypes: ["food_tracking"]
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, password_hash: "hashed_password" }] })
                .mockResolvedValueOnce({ rowCount: 15 });

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Selected data has been successfully deleted.",
                deleted: { food_tracking: 15 }
            });
        });

        it("should handle database errors gracefully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                password: "password123",
                timePeriod: "7",
                dataTypes: ["recipes"]
            };

            mockPool.query.mockRejectedValue(new Error("Database error"));

            await handleDeleteData(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "An error occurred while deleting data. Please try again later."
            });
        });
    });
});
