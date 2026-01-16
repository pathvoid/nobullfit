import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { handleFoodDatabaseSearch } from "./foodDatabaseHandler";

// Mock the OpenFoodFacts service
vi.mock("../utils/openFoodFactsService", () => ({
    searchFoods: vi.fn()
}));

import { searchFoods } from "../utils/openFoodFactsService.js";

describe("foodDatabaseHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            query: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("handleFoodDatabaseSearch", () => {
        it("should search for foods successfully", async () => {
            mockRequest.query = { query: "apple" };

            const mockSearchResult = {
                text: "apple",
                count: 100,
                parsed: [],
                hints: [{ food: { foodId: "3017620422003", label: "Apple" }, measures: [] }]
            };

            (searchFoods as ReturnType<typeof vi.fn>).mockResolvedValue(mockSearchResult);

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(searchFoods).toHaveBeenCalledWith("apple", 20, 0);
            expect(mockResponse.json).toHaveBeenCalledWith(mockSearchResult);
        });

        it("should handle pagination with offset", async () => {
            mockRequest.query = { query: "apple", offset: "20", limit: "10" };

            const mockSearchResult = {
                text: "apple",
                count: 100,
                parsed: [],
                hints: [{ food: { foodId: "3017620422003", label: "Apple" }, measures: [] }]
            };

            (searchFoods as ReturnType<typeof vi.fn>).mockResolvedValue(mockSearchResult);

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(searchFoods).toHaveBeenCalledWith("apple", 10, 20);
            expect(mockResponse.json).toHaveBeenCalledWith(mockSearchResult);
        });

        it("should return 400 if query is missing", async () => {
            mockRequest.query = {};

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Query parameter 'query' is required"
            });
        });

        it("should return 400 if offset is invalid", async () => {
            mockRequest.query = { query: "apple", offset: "-1" };

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid offset parameter"
            });
        });

        it("should return 400 if limit is invalid", async () => {
            mockRequest.query = { query: "apple", limit: "200" };

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid limit parameter (must be 1-100)"
            });
        });

        it("should handle search error", async () => {
            mockRequest.query = { query: "apple" };

            (searchFoods as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Internal server error",
                message: "Database error"
            });
        });
    });
});
