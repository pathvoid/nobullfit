import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleGetProgressTracking,
    handleGetRecentActivities,
    handleLogActivity,
    handleUpdateProgressTracking,
    handleDeleteProgressTracking
} from "./progressTrackingHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("progressTrackingHandler", () => {
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
            cookies: {},
            params: {},
            query: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    describe("handleGetProgressTracking", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if date is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = {};

            await handleGetProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Date parameter is required" });
        });

        it("should return activities for a specific date", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15", timezone: "UTC" };

            const mockActivities = [
                {
                    id: 1,
                    activity_type: "cardio",
                    activity_name: "Running",
                    activity_data: { duration: 30 },
                    calories_burned: "300"
                }
            ];

            mockPool.query.mockResolvedValue({ rows: mockActivities });

            await handleGetProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                activities: expect.arrayContaining([
                    expect.objectContaining({
                        activity_name: "Running",
                        calories_burned: 300
                    })
                ])
            });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15" };

            await handleGetProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleGetRecentActivities", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleGetRecentActivities(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return recent activities successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            const mockActivities = [
                {
                    activity_type: "cardio",
                    activity_name: "Running",
                    activity_data: { duration: 30 },
                    calories_burned: "300"
                },
                {
                    activity_type: "strength",
                    activity_name: "Weight lifting",
                    activity_data: { sets: 3, reps: 10 },
                    calories_burned: "150"
                }
            ];

            mockPool.query.mockResolvedValue({ rows: mockActivities });

            await handleGetRecentActivities(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                activities: expect.arrayContaining([
                    expect.objectContaining({ activity_name: "Running", calories_burned: 300 }),
                    expect.objectContaining({ activity_name: "Weight lifting", calories_burned: 150 })
                ])
            });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };

            await handleGetRecentActivities(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleLogActivity", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleLogActivity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if required fields are missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                activityType: "cardio"
                // Missing other required fields
            };

            await handleLogActivity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing required fields" });
        });

        it("should log an activity successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                activityType: "cardio",
                activityName: "Running",
                date: "2024-01-15",
                timezone: "UTC",
                activityData: { duration: 30, distance: 5 },
                caloriesBurned: 300
            };

            const insertedActivity = {
                id: 1,
                activity_type: "cardio",
                activity_name: "Running",
                date: "2024-01-15",
                calories_burned: 300
            };

            mockPool.query.mockResolvedValue({ rows: [insertedActivity] });

            await handleLogActivity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({ activity: insertedActivity });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                activityType: "cardio",
                activityName: "Running",
                date: "2024-01-15",
                timezone: "UTC",
                activityData: { duration: 30 }
            };

            await handleLogActivity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleUpdateProgressTracking", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleUpdateProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if ID is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = {};

            await handleUpdateProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Activity tracking ID is required" });
        });

        it("should return 400 if no fields to update", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };
            mockRequest.body = {};

            await handleUpdateProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "No fields to update" });
        });

        it("should update activity tracking entry successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };
            mockRequest.body = {
                activityName: "Jogging",
                caloriesBurned: 250
            };

            const updatedActivity = {
                id: 1,
                activity_type: "cardio",
                activity_name: "Jogging",
                activity_data: { duration: 30 },
                calories_burned: "250"
            };

            mockPool.query.mockResolvedValue({ rows: [updatedActivity] });

            await handleUpdateProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                activity: expect.objectContaining({
                    activity_name: "Jogging",
                    calories_burned: 250
                })
            });
        });

        it("should return 404 if entry not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "999" };
            mockRequest.body = { activityName: "Updated" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleUpdateProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Activity tracking entry not found" });
        });
    });

    describe("handleDeleteProgressTracking", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleDeleteProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if ID is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = {};

            await handleDeleteProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Activity tracking ID is required" });
        });

        it("should delete activity tracking entry successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };

            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await handleDeleteProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
        });

        it("should return 404 if entry not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "999" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleDeleteProgressTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Activity tracking entry not found" });
        });
    });
});
