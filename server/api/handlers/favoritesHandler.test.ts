import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleGetFavorites,
    handleAddFavorite,
    handleRemoveFavorite,
    handleCheckFavorite
} from "./favoritesHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("favoritesHandler", () => {
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

    describe("handleGetFavorites", () => {
        it("should return user favorites (food items and recipes combined)", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            const mockFoodFavorites = [
                { id: 1, food_id: "food1", food_label: "Apple", item_type: "food", created_at: "2024-01-02T00:00:00Z" },
                { id: 2, food_id: "food2", food_label: "Banana", item_type: "food", created_at: "2024-01-01T00:00:00Z" }
            ];

            const mockRecipeFavorites = [
                { 
                    id: 3, 
                    food_id: "1", 
                    food_label: "Chicken Salad", 
                    item_type: "recipe", 
                    food_data: { image_filename: "chicken.jpg", servings: 4, cooking_time_minutes: 30, is_public: true },
                    created_at: "2024-01-03T00:00:00Z" 
                }
            ];

            // First query: food favorites, Second query: recipe favorites with join
            mockPool.query
                .mockResolvedValueOnce({ rows: mockFoodFavorites })
                .mockResolvedValueOnce({ rows: mockRecipeFavorites });

            await handleGetFavorites(mockRequest as Request, mockResponse as Response);

            expect(mockPool.query).toHaveBeenCalledTimes(2);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            
            // Results should be sorted by created_at descending
            const responseCall = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(responseCall.favorites).toHaveLength(3);
            expect(responseCall.favorites[0].food_label).toBe("Chicken Salad");
            expect(responseCall.favorites[1].food_label).toBe("Apple");
            expect(responseCall.favorites[2].food_label).toBe("Banana");
        });

        it("should only return accessible recipes (public or owned by user)", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            // Food query returns empty
            // Recipe query only returns recipes accessible to user (per the WHERE clause)
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [
                    { 
                        id: 1, 
                        food_id: "5", 
                        food_label: "My Recipe", 
                        item_type: "recipe",
                        food_data: { image_filename: null, servings: 2, cooking_time_minutes: 15, is_public: false },
                        created_at: "2024-01-01T00:00:00Z"
                    }
                ]});

            await handleGetFavorites(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const responseCall = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(responseCall.favorites).toHaveLength(1);
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetFavorites(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Unauthorized"
            });
        });
    });

    describe("handleAddFavorite", () => {
        it("should add a favorite successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                foodId: "food1",
                foodLabel: "Apple",
                foodData: { calories: 95 },
                itemType: "food"
            };

            const mockFavorite = {
                id: 1,
                food_id: "food1",
                food_label: "Apple",
                food_data: { calories: 95 },
                item_type: "food",
                created_at: new Date()
            };

            mockPool.query.mockResolvedValue({ rows: [mockFavorite] });

            await handleAddFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                favorite: mockFavorite
            });
        });

        it("should return 400 if foodId is missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                foodLabel: "Apple"
            };

            await handleAddFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Food ID and label are required"
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleAddFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe("handleRemoveFavorite", () => {
        it("should remove a favorite successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { foodId: "food1" };
            mockRequest.query = { itemType: "food" };

            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await handleRemoveFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Favorite removed"
            });
        });

        it("should return 404 if favorite not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { foodId: "nonexistent" };
            mockRequest.query = { itemType: "food" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleRemoveFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Favorite not found"
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleRemoveFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe("handleCheckFavorite", () => {
        it("should return isFavorite true if food is favorited", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { foodId: "food1" };
            mockRequest.query = { itemType: "food" };

            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await handleCheckFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                isFavorite: true
            });
        });

        it("should return isFavorite false if food is not favorited", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { foodId: "food1" };
            mockRequest.query = { itemType: "food" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleCheckFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                isFavorite: false
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleCheckFavorite(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });
});
