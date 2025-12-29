import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetDashboardStats } from "./dashboardHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("dashboardHandler", () => {
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

    describe("handleGetDashboardStats", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });

        it("should return dashboard stats for week period", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { period: "week", timezone: "America/New_York" };

            // Today's food stats
            mockPool.query
                .mockResolvedValueOnce({
                    rows: [{
                        calories: "2000",
                        protein: "100",
                        carbs: "250",
                        fat: "80",
                        food_count: "5"
                    }]
                })
                // Today's activity stats
                .mockResolvedValueOnce({
                    rows: [{
                        calories_burned: "500",
                        activity_count: "2"
                    }]
                })
                // Weekly food stats
                .mockResolvedValueOnce({
                    rows: [
                        { date: new Date("2024-01-14"), calories: "1800", protein: "90", carbs: "230", fat: "70" },
                        { date: new Date("2024-01-15"), calories: "2000", protein: "100", carbs: "250", fat: "80" }
                    ]
                })
                // Weekly activity stats
                .mockResolvedValueOnce({
                    rows: [
                        { date: new Date("2024-01-14"), calories_burned: "400", activity_count: "1" },
                        { date: new Date("2024-01-15"), calories_burned: "500", activity_count: "2" }
                    ]
                })
                // Activity type distribution
                .mockResolvedValueOnce({
                    rows: [
                        { activity_type: "cardio", count: "3", total_calories: "600" }
                    ]
                })
                // Category distribution
                .mockResolvedValueOnce({
                    rows: [
                        { category: "Breakfast", count: "5", total_calories: "1500" },
                        { category: "Lunch", count: "5", total_calories: "2500" }
                    ]
                })
                // Weight data
                .mockResolvedValueOnce({
                    rows: [
                        { date: new Date("2024-01-14"), weight: "75.0", unit: "kg" },
                        { date: new Date("2024-01-15"), weight: "74.8", unit: "kg" }
                    ]
                })
                // Weight count check
                .mockResolvedValueOnce({ rows: [{ count: "2" }] })
                // TDEE data
                .mockResolvedValueOnce({ rows: [] });

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    today: expect.objectContaining({
                        calories_consumed: 2000,
                        calories_burned: 500,
                        protein: 100,
                        carbs: 250,
                        fat: 80
                    }),
                    averages: expect.objectContaining({
                        calories_consumed: expect.any(Number),
                        calories_burned: expect.any(Number)
                    }),
                    dailyStats: expect.any(Array),
                    activityTypes: expect.any(Array),
                    categories: expect.any(Array),
                    weightData: expect.any(Array),
                    weightUnit: "kg"
                })
            );
        });

        it("should return dashboard stats for month period", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { period: "month" };

            // Mock all queries with minimal data
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ calories: "0", protein: "0", carbs: "0", fat: "0", food_count: "0" }] })
                .mockResolvedValueOnce({ rows: [{ calories_burned: "0", activity_count: "0" }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                // Weight count check
                .mockResolvedValueOnce({ rows: [{ count: "0" }] });

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    today: expect.any(Object),
                    averages: expect.any(Object),
                    dailyStats: expect.any(Array)
                })
            );
        });

        it("should return dashboard stats for all time period", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { period: "all" };

            // Mock all queries
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ calories: "1500", protein: "75", carbs: "200", fat: "60", food_count: "3" }] })
                .mockResolvedValueOnce({ rows: [{ calories_burned: "300", activity_count: "1" }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                // Weight count check
                .mockResolvedValueOnce({ rows: [{ count: "0" }] });

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should handle weight unit conversion (lbs)", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { period: "week" };

            // Mock all queries with lbs weight data
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ calories: "0", protein: "0", carbs: "0", fat: "0", food_count: "0" }] })
                .mockResolvedValueOnce({ rows: [{ calories_burned: "0", activity_count: "0" }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        { date: new Date("2024-01-14"), weight: "165", unit: "lbs" },
                        { date: new Date("2024-01-15"), weight: "164", unit: "lbs" }
                    ]
                })
                // Weight count check
                .mockResolvedValueOnce({ rows: [{ count: "2" }] })
                // TDEE data
                .mockResolvedValueOnce({ rows: [] });

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    weightUnit: "lbs",
                    weightData: expect.arrayContaining([
                        expect.objectContaining({ unit: "lbs" })
                    ])
                })
            );
        });

        it("should handle mixed weight units and convert to last used unit", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { period: "week" };

            // Mock all queries with mixed weight units
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ calories: "0", protein: "0", carbs: "0", fat: "0", food_count: "0" }] })
                .mockResolvedValueOnce({ rows: [{ calories_burned: "0", activity_count: "0" }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        { date: new Date("2024-01-14"), weight: "75", unit: "kg" },
                        { date: new Date("2024-01-15"), weight: "165", unit: "lbs" }
                    ]
                })
                // Weight count check
                .mockResolvedValueOnce({ rows: [{ count: "2" }] })
                // TDEE data
                .mockResolvedValueOnce({ rows: [] });

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // Last unit is lbs, so all should be converted to lbs
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    weightUnit: "lbs"
                })
            );
        });

        it("should handle database errors gracefully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { period: "week" };

            mockPool.query.mockRejectedValue(new Error("Database error"));

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });

        it("should default to week period if not specified", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = {};

            // Mock all queries
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ calories: "0", protein: "0", carbs: "0", fat: "0", food_count: "0" }] })
                .mockResolvedValueOnce({ rows: [{ calories_burned: "0", activity_count: "0" }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                // Weight count check
                .mockResolvedValueOnce({ rows: [{ count: "0" }] });

            await handleGetDashboardStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });
});
