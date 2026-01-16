import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { handleFoodDetails } from "./foodDetailsHandler";

// Mock the OpenFoodFacts service
vi.mock("../utils/openFoodFactsService", () => ({
    getFoodById: vi.fn()
}));

import { getFoodById } from "../utils/openFoodFactsService.js";

describe("foodDetailsHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            params: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("handleFoodDetails", () => {
        it("should return food details successfully", async () => {
            mockRequest.params = { foodId: "3017620422003" };

            const mockFood = {
                foodId: "3017620422003",
                label: "Apple",
                nutrients: { ENERC_KCAL: 52 },
                measures: [
                    { uri: "off://serving", label: "Serving", weight: 182 },
                    { uri: "off://gram", label: "Gram", weight: 1 }
                ]
            };

            (getFoodById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFood);

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(getFoodById).toHaveBeenCalledWith("3017620422003");
            expect(mockResponse.json).toHaveBeenCalledWith({ food: mockFood });
        });

        it("should handle URL-encoded food IDs", async () => {
            mockRequest.params = { foodId: "3017620422003%2Ftest" };

            const mockFood = {
                foodId: "3017620422003/test",
                label: "Test Food"
            };

            (getFoodById as ReturnType<typeof vi.fn>).mockResolvedValue(mockFood);

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(getFoodById).toHaveBeenCalledWith("3017620422003/test");
            expect(mockResponse.json).toHaveBeenCalledWith({ food: mockFood });
        });

        it("should return 400 if foodId is missing", async () => {
            mockRequest.params = {};

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Food ID parameter is required"
            });
        });

        it("should return 404 if food not found", async () => {
            mockRequest.params = { foodId: "nonexistent_food" };

            (getFoodById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Food not found"
            });
        });

        it("should handle database error", async () => {
            mockRequest.params = { foodId: "3017620422003" };

            (getFoodById as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Internal server error",
                message: "Database error"
            });
        });
    });
});
