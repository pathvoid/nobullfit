import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleGetFoodTracking,
    handleLogFood,
    handleUpdateFoodTracking,
    handleDeleteFoodTracking,
    handleGetRecentFoods
} from "./foodTrackingHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/edamamNutrients", () => ({
    calculateNutrientsForFood: vi.fn(),
    convertEdamamNutrientsToOurFormat: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { calculateNutrientsForFood, convertEdamamNutrientsToOurFormat } from "../utils/edamamNutrients.js";

describe("foodTrackingHandler", () => {
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

    describe("handleGetFoodTracking", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if date is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = {};

            await handleGetFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Date parameter is required" });
        });

        it("should return foods for a specific date", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15", timezone: "America/New_York" };

            const mockFoods = [
                {
                    id: 1,
                    item_type: "food",
                    food_id: "food_123",
                    food_label: "Apple",
                    category: "Breakfast",
                    quantity: 1
                }
            ];

            mockPool.query.mockResolvedValue({ rows: mockFoods });

            await handleGetFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ foods: mockFoods });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { date: "2024-01-15" };

            await handleGetFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });

    describe("handleLogFood", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleLogFood(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if required fields are missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                foodId: "food_123"
                // Missing other required fields
            };

            await handleLogFood(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Missing required fields" });
        });

        it("should return 400 if recipe data is missing for recipe items", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                itemType: "recipe",
                foodId: "recipe_123",
                foodLabel: "Pasta",
                foodData: { id: 1 },
                quantity: 1,
                category: "Dinner",
                date: "2024-01-15",
                timezone: "UTC"
            };

            await handleLogFood(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Recipe data is required for recipe items" });
        });

        it("should log a food item successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                itemType: "food",
                foodId: "food_123",
                foodLabel: "Apple",
                foodData: { id: "food_123", nutrients: { ENERC_KCAL: 52 } },
                quantity: 1,
                measureUri: "http://www.edamam.com/ontologies/edamam.owl#Measure_unit",
                measureLabel: "whole",
                category: "Breakfast",
                date: "2024-01-15",
                timezone: "UTC",
                nutrients: { ENERC_KCAL: 52 }
            };

            const insertedFood = {
                id: 1,
                item_type: "food",
                food_id: "food_123",
                food_label: "Apple",
                quantity: 1
            };

            mockPool.query.mockResolvedValue({ rows: [insertedFood] });

            await handleLogFood(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({ food: insertedFood });
        });

        it("should log a recipe item successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                itemType: "recipe",
                foodId: "1",
                foodLabel: "Pasta",
                foodData: { id: 1, name: "Pasta" },
                recipeData: { id: 1, name: "Pasta", ingredients: [] },
                quantity: 2,
                measureLabel: "servings",
                category: "Dinner",
                date: "2024-01-15",
                timezone: "UTC",
                nutrients: { ENERC_KCAL: 500 }
            };

            const insertedFood = {
                id: 1,
                item_type: "recipe",
                food_id: "1",
                food_label: "Pasta",
                quantity: 2
            };

            mockPool.query.mockResolvedValue({ rows: [insertedFood] });

            await handleLogFood(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({ food: insertedFood });
        });

        it("should calculate nutrients from Edamam API if not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (calculateNutrientsForFood as ReturnType<typeof vi.fn>).mockResolvedValue({
                calories: 100,
                totalNutrients: { ENERC_KCAL: { quantity: 100 } }
            });
            (convertEdamamNutrientsToOurFormat as ReturnType<typeof vi.fn>).mockReturnValue({
                ENERC_KCAL: 100
            });

            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                itemType: "food",
                foodId: "food_123",
                foodLabel: "Apple",
                foodData: { id: "food_123" },
                quantity: 1,
                measureUri: "http://www.edamam.com/ontologies/edamam.owl#Measure_unit",
                measureLabel: "whole",
                category: "Breakfast",
                date: "2024-01-15",
                timezone: "UTC"
            };

            const insertedFood = {
                id: 1,
                item_type: "food",
                food_id: "food_123",
                food_label: "Apple"
            };

            mockPool.query.mockResolvedValue({ rows: [insertedFood] });

            await handleLogFood(mockRequest as Request, mockResponse as Response);

            expect(calculateNutrientsForFood).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });
    });

    describe("handleUpdateFoodTracking", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleUpdateFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if ID is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = {};

            await handleUpdateFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Food tracking ID is required" });
        });

        it("should return 400 if no fields to update", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };
            mockRequest.body = {};

            await handleUpdateFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "No fields to update" });
        });

        it("should update food tracking entry successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };
            mockRequest.body = { quantity: 2, category: "Lunch" };

            const updatedFood = {
                id: 1,
                item_type: "food",
                food_id: "food_123",
                quantity: 2,
                category: "Lunch"
            };

            mockPool.query.mockResolvedValue({ rows: [updatedFood] });

            await handleUpdateFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ food: updatedFood });
        });

        it("should return 404 if entry not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "999" };
            mockRequest.body = { quantity: 2 };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleUpdateFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Food tracking entry not found" });
        });
    });

    describe("handleDeleteFoodTracking", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleDeleteFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 if ID is not provided", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = {};

            await handleDeleteFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Food tracking ID is required" });
        });

        it("should delete food tracking entry successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "1" };

            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await handleDeleteFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
        });

        it("should return 404 if entry not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { id: "999" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleDeleteFoodTracking(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Food tracking entry not found" });
        });
    });

    describe("handleGetRecentFoods", () => {
        it("should return 401 if not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};

            await handleGetRecentFoods(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return recent foods successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            const mockFoods = [
                {
                    item_type: "food",
                    food_id: "food_123",
                    food_label: "Apple",
                    food_data: { id: "food_123" },
                    recipe_data: null,
                    nutrients: { ENERC_KCAL: 52 }
                },
                {
                    item_type: "recipe",
                    food_id: "1",
                    food_label: "Pasta",
                    food_data: { id: 1 },
                    recipe_data: { id: 1, name: "Pasta" },
                    nutrients: { ENERC_KCAL: 500 }
                }
            ];

            mockPool.query.mockResolvedValue({ rows: mockFoods });

            await handleGetRecentFoods(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                foods: expect.arrayContaining([
                    expect.objectContaining({ food_id: "food_123" }),
                    expect.objectContaining({ food_id: "1" })
                ])
            });
        });

        it("should return 500 if database is not available", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer token" };

            await handleGetRecentFoods(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });
    });
});
