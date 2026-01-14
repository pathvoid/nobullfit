import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetGoalInsights } from "./goalInsightsHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("goalInsightsHandler", () => {
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

    describe("handleGetGoalInsights", () => {
        it("should return 401 when not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 when database is not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });

        it("should return 403 for non-Pro users", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: false }] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Goal insights is a Pro feature" });
        });

        it("should return hasGoal: false when no goal is set", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - no goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: null, target_weight: null, target_weight_unit: null }] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                hasGoal: false,
                message: "No weight goal set. Set your goal in the TDEE page."
            });
        });

        it("should return hasTdee: false when TDEE is not set", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - has goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "lose", target_weight: 70, target_weight_unit: "kg" }] });
            // No TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                hasGoal: true,
                hasTdee: false,
                message: "Please calculate your TDEE first to see goal insights."
            });
        });

        it("should return hasWeight: false when no weight data exists", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - has goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "lose", target_weight: 70, target_weight_unit: "kg" }] });
            // TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: 2500, activity_level: "moderately_active" }] });
            // No weight data
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                hasGoal: true,
                hasTdee: true,
                hasWeight: false,
                message: "Please log your weight in Progress Tracking to see goal insights."
            });
        });

        it("should return full insights for Pro user with goal, TDEE, and weight", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - has goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "lose", target_weight: "70", target_weight_unit: "kg" }] });
            // TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2500", activity_level: "moderately_active" }] });
            // Current weight
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "80", unit: "kg" }] });
            // Weekly progress query - empty for simplicity
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            expect(response.hasGoal).toBe(true);
            expect(response.hasTdee).toBe(true);
            expect(response.hasWeight).toBe(true);
            expect(response.insights).toBeDefined();
            expect(response.insights.weightGoal).toBe("lose");
            expect(response.insights.targetWeight).toBe(70);
            expect(response.insights.currentWeight).toBe(80);
            expect(response.insights.weightUnit).toBe("kg");
            expect(response.insights.tdee).toBe(2500);
            expect(response.insights.recommendedCalories).toBe(2000); // TDEE - 500 for weight loss
            expect(response.insights.calorieAdjustment).toBe(-500);
        });

        it("should calculate correct calories for weight gain goal", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - gain goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "gain", target_weight: "85", target_weight_unit: "kg" }] });
            // TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2500", activity_level: "very_active" }] });
            // Current weight
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "75", unit: "kg" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            expect(response.insights.weightGoal).toBe("gain");
            expect(response.insights.recommendedCalories).toBe(2800); // TDEE + 300 for gain
            expect(response.insights.calorieAdjustment).toBe(300);
        });

        it("should calculate correct calories for maintenance goal", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - maintain goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "maintain", target_weight: null, target_weight_unit: null }] });
            // TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2200", activity_level: "sedentary" }] });
            // Current weight
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "70", unit: "kg" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            expect(response.insights.weightGoal).toBe("maintain");
            expect(response.insights.recommendedCalories).toBe(2200); // Same as TDEE
            expect(response.insights.calorieAdjustment).toBe(0);
        });

        it("should use activity level for protein recommendations", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - maintain goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "maintain", target_weight: null, target_weight_unit: null }] });
            // TDEE data with very active
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2800", activity_level: "very_active" }] });
            // Current weight (80kg)
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "80", unit: "kg" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            // Very active: 1.8g/kg × 80kg = 144g protein
            // Should be at least 144g for a very active person
            expect(response.insights.macros.proteinGrams).toBeGreaterThanOrEqual(140);
        });

        it("should give higher protein for weight loss to preserve muscle", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - lose goal
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "lose", target_weight: "70", target_weight_unit: "kg" }] });
            // TDEE data with moderately active
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2400", activity_level: "moderately_active" }] });
            // Current weight (80kg)
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "80", unit: "kg" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            // For weight loss, uses target weight (70kg) with bonus multiplier
            // Moderately active (1.6) + 0.2 for weight loss = 1.8g/kg
            // 70kg × 1.8 = 126g
            expect(response.insights.macros.proteinGrams).toBeGreaterThanOrEqual(120);
        });

        it("should cap protein at 220g maximum", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - gain goal with high target weight
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "gain", target_weight: "150", target_weight_unit: "kg" }] });
            // TDEE data with extremely active (highest protein needs)
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "4000", activity_level: "extremely_active" }] });
            // Current weight (very high)
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "140", unit: "kg" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            // Should be capped at 220g
            expect(response.insights.macros.proteinGrams).toBeLessThanOrEqual(220);
        });

        it("should handle lbs weight unit correctly", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - lose goal with target in lbs
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "lose", target_weight: "180", target_weight_unit: "lbs" }] });
            // TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2600", activity_level: "lightly_active" }] });
            // Current weight in lbs
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "200", unit: "lbs" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            expect(response.insights.currentWeight).toBe(200);
            expect(response.insights.weightUnit).toBe("lbs");
            expect(response.insights.weeklyTargetChange).toBe(-1); // 1 lb/week for lbs users
        });

        it("should handle database errors gracefully", async () => {
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });

        it("should convert target weight when stored unit differs from current unit", async () => {
            // User is Pro
            mockPool.query.mockResolvedValueOnce({ rows: [{ subscribed: true }] });
            // User settings - target weight stored in lbs
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight_goal: "lose", target_weight: "154", target_weight_unit: "lbs" }] });
            // TDEE data
            mockPool.query.mockResolvedValueOnce({ rows: [{ tdee: "2200", activity_level: "moderately_active" }] });
            // Current weight in kg (user switched to kg)
            mockPool.query.mockResolvedValueOnce({ rows: [{ weight: "80", unit: "kg" }] });
            // Weekly progress query
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetGoalInsights(mockRequest as Request, mockResponse as Response);

            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            
            expect(response.insights.currentWeight).toBe(80);
            expect(response.insights.weightUnit).toBe("kg");
            // 154 lbs should be converted to ~70 kg (154 * 0.453592 = 69.85)
            expect(response.insights.targetWeight).toBeCloseTo(69.9, 0);
        });
    });
});
