import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { handleFoodDatabaseSearch } from "./foodDatabaseHandler";

describe("foodDatabaseHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();

        // Set environment variables for Edamam API
        process.env.EDAMAM_APP_ID = "test_app_id";
        process.env.EDAMAM_APP_KEY = "test_app_key";

        mockRequest = {
            query: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        // Mock global fetch
        global.fetch = vi.fn();
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe("handleFoodDatabaseSearch", () => {
        it("should search for foods successfully", async () => {
            mockRequest.query = { query: "apple" };

            const mockApiResponse = {
                parsed: [{ food: { foodId: "food1", label: "Apple" } }],
                hints: [{ food: { foodId: "food2", label: "Green Apple" } }]
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("api.edamam.com/api/food-database/v2/parser"),
                expect.any(Object)
            );
            expect(mockResponse.json).toHaveBeenCalledWith(mockApiResponse);
        });

        it("should handle pagination with nextUrl", async () => {
            const nextUrl = "https://api.edamam.com/api/food-database/v2/parser?session=abc123";
            mockRequest.query = { nextUrl };

            const mockApiResponse = {
                hints: [{ food: { foodId: "food3", label: "Another Food" } }]
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(global.fetch).toHaveBeenCalledWith(nextUrl, expect.any(Object));
            expect(mockResponse.json).toHaveBeenCalledWith(mockApiResponse);
        });

        it("should return 400 if query and nextUrl are missing", async () => {
            mockRequest.query = {};

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Query parameter 'query' or 'nextUrl' is required"
            });
        });

        it("should return 500 if Edamam credentials are not configured", async () => {
            delete process.env.EDAMAM_APP_ID;
            delete process.env.EDAMAM_APP_KEY;
            mockRequest.query = { query: "apple" };

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Edamam API credentials not configured"
            });
        });

        it("should handle Edamam API error", async () => {
            mockRequest.query = { query: "apple" };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 429,
                text: () => Promise.resolve("Rate limit exceeded")
            });

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(429);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Failed to fetch from Edamam API",
                details: "Rate limit exceeded"
            });
        });

        it("should handle fetch error", async () => {
            mockRequest.query = { query: "apple" };

            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

            await handleFoodDatabaseSearch(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Internal server error",
                message: "Network error"
            });
        });
    });
});
