import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    calculateBMR,
    calculateTDEE,
    handleGetLatestWeight,
    handleGetTDEE,
    handleSaveTDEE
} from "./tdeeHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("tdeeHandler", () => {
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

    describe("calculateBMR", () => {
        it("should calculate BMR correctly for males", () => {
            // Using Mifflin-St Jeor: (10 * weight) + (6.25 * height) - (5 * age) + 5
            // For 70kg, 175cm, 30 years, male: (10*70) + (6.25*175) - (5*30) + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
            const bmr = calculateBMR(70, 175, 30, "male");
            expect(bmr).toBeCloseTo(1648.75, 2);
        });

        it("should calculate BMR correctly for females", () => {
            // Using Mifflin-St Jeor: (10 * weight) + (6.25 * height) - (5 * age) - 161
            // For 60kg, 165cm, 25 years, female: (10*60) + (6.25*165) - (5*25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
            const bmr = calculateBMR(60, 165, 25, "female");
            expect(bmr).toBeCloseTo(1345.25, 2);
        });

        it("should handle edge cases with low weight", () => {
            const bmr = calculateBMR(40, 150, 20, "female");
            expect(bmr).toBeGreaterThan(0);
        });

        it("should handle edge cases with high weight", () => {
            const bmr = calculateBMR(150, 190, 40, "male");
            expect(bmr).toBeGreaterThan(0);
        });
    });

    describe("calculateTDEE", () => {
        const baseBMR = 1500;

        it("should apply sedentary multiplier (1.2)", () => {
            const tdee = calculateTDEE(baseBMR, "sedentary");
            expect(tdee).toBe(1800);
        });

        it("should apply lightly_active multiplier (1.375)", () => {
            const tdee = calculateTDEE(baseBMR, "lightly_active");
            expect(tdee).toBe(2062.5);
        });

        it("should apply moderately_active multiplier (1.55)", () => {
            const tdee = calculateTDEE(baseBMR, "moderately_active");
            expect(tdee).toBe(2325);
        });

        it("should apply very_active multiplier (1.725)", () => {
            const tdee = calculateTDEE(baseBMR, "very_active");
            expect(tdee).toBe(2587.5);
        });

        it("should apply extremely_active multiplier (1.9)", () => {
            const tdee = calculateTDEE(baseBMR, "extremely_active");
            expect(tdee).toBe(2850);
        });

        it("should default to sedentary multiplier for unknown activity level", () => {
            const tdee = calculateTDEE(baseBMR, "unknown_level");
            expect(tdee).toBe(1800);
        });
    });

    describe("handleGetLatestWeight", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetLatestWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 if database connection fails", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetLatestWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available"
            });
        });

        it("should return null if no weight entries exist", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({ rows: [] });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetLatestWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ weight: null });
        });

        it("should return the latest weight entry", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({
                rows: [{ weight: "75.5", unit: "kg" }]
            });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetLatestWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                weight: { weight: 75.5, unit: "kg" }
            });
        });

        it("should handle weight in lbs", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({
                rows: [{ weight: "165", unit: "lbs" }]
            });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetLatestWeight(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                weight: { weight: 165, unit: "lbs" }
            });
        });
    });

    describe("handleGetTDEE", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 if database connection fails", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available"
            });
        });

        it("should return null if no TDEE data exists", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({ rows: [] });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ tdee: null });
        });

        it("should return TDEE data with parsed numbers", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            const mockTDEE = {
                id: 1,
                age: "30",
                gender: "male",
                height_cm: "175.5",
                activity_level: "moderately_active",
                bmr: "1648.75",
                tdee: "2555.56",
                created_at: new Date(),
                updated_at: new Date()
            };
            mockPool.query.mockResolvedValue({ rows: [mockTDEE] });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                tdee: expect.objectContaining({
                    age: 30,
                    height_cm: 175.5,
                    bmr: 1648.75,
                    tdee: 2555.56
                })
            });
        });
    });

    describe("handleSaveTDEE", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if required fields are missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = { age: 30 };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing required fields" });
        });

        it("should return 400 for invalid gender", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "other",
                heightCm: 175,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Gender must be 'male' or 'female'"
            });
        });

        it("should return 400 for invalid activity level", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "male",
                heightCm: 175,
                activityLevel: "super_active"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid activity level" });
        });

        it("should return 400 for invalid age", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 200,
                gender: "male",
                heightCm: 175,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Age must be a valid number between 1 and 150"
            });
        });

        it("should return 400 for invalid height", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "male",
                heightCm: -10,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Height must be a valid positive number (in cm)"
            });
        });

        it("should return 400 if no weight data exists", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({ rows: [] });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "male",
                heightCm: 175,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Weight data is required. Please log your weight in Progress Tracking first."
            });
        });

        it("should save TDEE data with weight in kg", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });

            const mockResult = {
                id: 1,
                age: "30",
                gender: "male",
                height_cm: "175",
                activity_level: "sedentary",
                bmr: "1648.75",
                tdee: "1978.5",
                created_at: new Date(),
                updated_at: new Date()
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ weight: "70", unit: "kg" }] })
                .mockResolvedValueOnce({ rows: [mockResult] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "male",
                heightCm: 175,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                tdee: expect.objectContaining({
                    age: 30,
                    height_cm: 175,
                    bmr: expect.any(Number),
                    tdee: expect.any(Number)
                })
            });
        });

        it("should convert weight from lbs to kg before calculating", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });

            const mockResult = {
                id: 1,
                age: "30",
                gender: "male",
                height_cm: "175",
                activity_level: "sedentary",
                bmr: "1700",
                tdee: "2040",
                created_at: new Date(),
                updated_at: new Date()
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ weight: "154", unit: "lbs" }] })
                .mockResolvedValueOnce({ rows: [mockResult] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "male",
                heightCm: 175,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // The second query (INSERT) should have been called
            expect(mockPool.query).toHaveBeenCalledTimes(2);
        });

        it("should accept token from cookie", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({ rows: [] });
            mockRequest.cookies = { auth_token: "valid_token" };
            mockRequest.body = {
                age: 30,
                gender: "male",
                heightCm: 175,
                activityLevel: "sedentary"
            };

            await handleSaveTDEE(mockRequest as Request, mockResponse as Response);

            expect(verifyToken).toHaveBeenCalledWith("valid_token");
        });
    });
});
