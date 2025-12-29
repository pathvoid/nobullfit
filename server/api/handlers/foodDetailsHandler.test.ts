import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "express";
import { handleFoodDetails } from "./foodDetailsHandler";

describe("foodDetailsHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.clearAllMocks();

        // Set environment variables for Edamam API
        process.env.EDAMAM_APP_ID = "test_app_id";
        process.env.EDAMAM_APP_KEY = "test_app_key";

        mockRequest = {
            params: {}
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

    describe("handleFoodDetails", () => {
        it("should return food details successfully", async () => {
            mockRequest.params = { foodId: "food_abc123" };

            const mockFoodMatch = {
                food: {
                    foodId: "food_abc123",
                    label: "Apple",
                    nutrients: { ENERC_KCAL: 52 }
                },
                measures: []
            };

            const mockApiResponse = {
                hints: [mockFoodMatch],
                parsed: []
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining("api.edamam.com/api/food-database/v2/parser"),
                expect.any(Object)
            );
            // Handler merges measures into food object
            expect(mockResponse.json).toHaveBeenCalledWith({
                food: {
                    foodId: "food_abc123",
                    label: "Apple",
                    nutrients: { ENERC_KCAL: 52 },
                    measures: []
                }
            });
        });

        it("should handle URI-style food IDs", async () => {
            mockRequest.params = { foodId: "food%23recipe_abc123" };

            const mockFoodMatch = {
                food: {
                    foodId: "food#recipe_abc123",
                    label: "Custom Recipe"
                },
                measures: []
            };

            const mockApiResponse = {
                hints: [mockFoodMatch],
                parsed: []
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            // Handler merges measures into food object
            expect(mockResponse.json).toHaveBeenCalledWith({
                food: {
                    foodId: "food#recipe_abc123",
                    label: "Custom Recipe",
                    measures: []
                }
            });
        });

        it("should return 400 if foodId is missing", async () => {
            mockRequest.params = {};

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Food ID parameter is required"
            });
        });

        it("should return 500 if Edamam credentials are not configured", async () => {
            delete process.env.EDAMAM_APP_ID;
            delete process.env.EDAMAM_APP_KEY;
            mockRequest.params = { foodId: "food_abc123" };

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Edamam API credentials not configured"
            });
        });

        it("should return 404 if food not found", async () => {
            mockRequest.params = { foodId: "nonexistent_food" };

            const mockApiResponse = {
                hints: [],
                parsed: []
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Food not found"
            });
        });

        it("should handle Edamam API error", async () => {
            mockRequest.params = { foodId: "food_abc123" };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: false,
                status: 401,
                text: () => Promise.resolve("Unauthorized")
            });

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Failed to fetch food details from Edamam API",
                details: "Unauthorized"
            });
        });

        it("should handle fetch error", async () => {
            mockRequest.params = { foodId: "food_abc123" };

            (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Internal server error",
                message: "Network error"
            });
        });

        it("should use parsed result if no hints match", async () => {
            mockRequest.params = { foodId: "food_abc123" };

            const mockParsedFood = {
                food: {
                    foodId: "food_abc123",
                    label: "Parsed Apple"
                }
            };

            const mockApiResponse = {
                hints: [{ food: { foodId: "different_id", label: "Different Food" } }],
                parsed: [mockParsedFood]
            };

            (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            await handleFoodDetails(mockRequest as Request, mockResponse as Response);

            // Handler adds measures: [] if not present
            expect(mockResponse.json).toHaveBeenCalledWith({
                food: {
                    foodId: "food_abc123",
                    label: "Parsed Apple",
                    measures: []
                }
            });
        });
    });
});
