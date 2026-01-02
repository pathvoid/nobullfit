import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleGetWeight,
    handleGetLastWeightUnit,
    handleLogWeight,
    handleDeleteWeight
} from "./weightTrackingHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("weightTrackingHandler", () => {
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

    describe("handleGetWeight", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if date is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = {};

            await handleGetWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Date parameter is required" });
        });

        it("should return weight for a specific date", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15" };

            const mockWeight = {
                id: 1,
                weight: "75.5",
                unit: "kg",
                date: "2024-01-15"
            };

            mockPool.query.mockResolvedValue({ rows: [mockWeight] });

            await handleGetWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                weight: expect.objectContaining({
                    id: 1,
                    weight: 75.5,
                    unit: "kg"
                })
            });
        });

        it("should return null if no weight found for date", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ weight: null });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15" };

            await handleGetWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleGetLastWeightUnit", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleGetLastWeightUnit(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return last used unit", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            mockPool.query.mockResolvedValue({ rows: [{ unit: "lbs" }] });

            await handleGetLastWeightUnit(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ unit: "lbs" });
        });

        it("should return kg as default if no entries exist", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetLastWeightUnit(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ unit: "kg" });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };

            await handleGetLastWeightUnit(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleLogWeight", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if required fields are missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 75
                // Missing other required fields
            };

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing required fields" });
        });

        it("should return 400 if unit is invalid", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 75,
                unit: "stones",
                date: "2024-01-15",
                timezone: "UTC"
            };

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unit must be 'kg' or 'lbs'" });
        });

        it("should return 400 if weight is not positive", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: -5,
                unit: "kg",
                date: "2024-01-15",
                timezone: "UTC"
            };

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Weight must be a positive number" });
        });

        it("should log weight successfully without TDEE recalculation when TDEE not set up", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 75.5,
                unit: "kg",
                date: "2024-01-15",
                timezone: "UTC"
            };

            const insertedWeight = {
                id: 1,
                weight: "75.5",
                unit: "kg",
                date: "2024-01-15"
            };

            // First call: insert weight, second call: check TDEE (not set up)
            mockPool.query
                .mockResolvedValueOnce({ rows: [insertedWeight] })
                .mockResolvedValueOnce({ rows: [] });

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                weight: expect.objectContaining({
                    id: 1,
                    weight: 75.5,
                    unit: "kg"
                })
            });
            // Should not call update TDEE query (only 2 queries: insert + check TDEE)
            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });

        it("should recalculate TDEE when logging latest weight and TDEE is set up", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 80,
                unit: "kg",
                date: "2024-01-15",
                timezone: "UTC"
            };

            const insertedWeight = {
                id: 1,
                weight: "80",
                unit: "kg",
                date: "2024-01-15"
            };

            const tdeeData = {
                age: 30,
                gender: "male",
                height_cm: "175",
                activity_level: "moderately_active"
            };

            // Mock queries in order: insert weight, check TDEE, check latest weight date, update TDEE
            mockPool.query
                .mockResolvedValueOnce({ rows: [insertedWeight] })
                .mockResolvedValueOnce({ rows: [tdeeData] })
                .mockResolvedValueOnce({ rows: [{ date: "2024-01-15" }] })
                .mockResolvedValueOnce({ rows: [] });

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // Should have called update TDEE query
            expect(mockPool.query).toHaveBeenCalledTimes(4);
            // Verify the update TDEE query was called with calculated values
            expect(mockPool.query).toHaveBeenLastCalledWith(
                expect.stringContaining("UPDATE user_tdee"),
                expect.arrayContaining([expect.any(Number), expect.any(Number), 1])
            );
        });

        it("should not recalculate TDEE when weight logged is not the latest date", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 75,
                unit: "kg",
                date: "2024-01-10",
                timezone: "UTC"
            };

            const insertedWeight = {
                id: 1,
                weight: "75",
                unit: "kg",
                date: "2024-01-10"
            };

            const tdeeData = {
                age: 30,
                gender: "male",
                height_cm: "175",
                activity_level: "moderately_active"
            };

            // Mock queries: insert weight, check TDEE (exists), check latest weight (different date)
            mockPool.query
                .mockResolvedValueOnce({ rows: [insertedWeight] })
                .mockResolvedValueOnce({ rows: [tdeeData] })
                .mockResolvedValueOnce({ rows: [{ date: "2024-01-15" }] });

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // Should not call update TDEE query since weight is not the latest
            expect(mockPool.query).toHaveBeenCalledTimes(3);
        });

        it("should recalculate TDEE with lbs to kg conversion", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 176.37,
                unit: "lbs",
                date: "2024-01-15",
                timezone: "UTC"
            };

            const insertedWeight = {
                id: 1,
                weight: "176.37",
                unit: "lbs",
                date: "2024-01-15"
            };

            const tdeeData = {
                age: 30,
                gender: "female",
                height_cm: "165",
                activity_level: "lightly_active"
            };

            // Mock queries in order: insert weight, check TDEE, check latest weight date, update TDEE
            mockPool.query
                .mockResolvedValueOnce({ rows: [insertedWeight] })
                .mockResolvedValueOnce({ rows: [tdeeData] })
                .mockResolvedValueOnce({ rows: [{ date: "2024-01-15" }] })
                .mockResolvedValueOnce({ rows: [] });

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockPool.query).toHaveBeenCalledTimes(4);
        });

        it("should update existing weight for same date (upsert)", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 76,
                unit: "kg",
                date: "2024-01-15",
                timezone: "UTC"
            };

            const updatedWeight = {
                id: 1,
                weight: "76",
                unit: "kg",
                date: "2024-01-15"
            };

            // Mock queries: insert/update weight, check TDEE (not set up)
            mockPool.query
                .mockResolvedValueOnce({ rows: [updatedWeight] })
                .mockResolvedValueOnce({ rows: [] });

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("ON CONFLICT"),
                expect.any(Array)
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                weight: 75,
                unit: "kg",
                date: "2024-01-15",
                timezone: "UTC"
            };

            await handleLogWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleDeleteWeight", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleDeleteWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if ID is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = {};

            await handleDeleteWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Weight ID is required" });
        });

        it("should delete weight entry successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };

            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await handleDeleteWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
        });

        it("should return 404 if entry not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "999" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleDeleteWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Weight entry not found" });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };

            await handleDeleteWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });
});
