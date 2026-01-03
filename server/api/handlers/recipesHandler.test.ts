import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetRecipes, handleGetRecipe, handleCreateRecipe, handleUpdateRecipe, handleDeleteRecipe } from "./recipesHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/r2Service", () => ({
    deleteRecipeImageIfUnused: vi.fn()
}));

vi.mock("../utils/emojiValidation", () => ({
    containsEmoji: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { deleteRecipeImageIfUnused } from "../utils/r2Service.js";
import { containsEmoji } from "../utils/emojiValidation.js";

describe("recipesHandler", () => {
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
            params: {},
            query: {},
            body: {},
            headers: {},
            cookies: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            cookie: vi.fn().mockReturnThis(),
            clearCookie: vi.fn().mockReturnThis()
        };
    });

    describe("handleGetRecipes", () => {
        it("should return recipes for authenticated user", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };

            const mockRecipes = [
                { id: 1, name: "Recipe 1", is_public: true },
                { id: 2, name: "Recipe 2", is_public: false }
            ];

            // Single query that returns all recipes, pagination is done client-side
            mockPool.query.mockResolvedValue({ rows: mockRecipes });

            await handleGetRecipes(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                recipes: expect.arrayContaining([
                    expect.objectContaining({ id: 1, name: "Recipe 1" }),
                    expect.objectContaining({ id: 2, name: "Recipe 2" })
                ]),
                pagination: expect.objectContaining({
                    total: 2
                })
            }));
        });

        it("should filter recipes by search query", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.query = { search: "chocolate" };

            const mockRecipes = [{ id: 1, name: "Chocolate Cake", is_public: true }];
            // Single query that returns all recipes with search filter
            mockPool.query.mockResolvedValue({ rows: mockRecipes });

            await handleGetRecipes(mockRequest as Request, mockResponse as Response);

            // The query should contain the search term
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("LIKE"),
                expect.arrayContaining([expect.stringContaining("chocolate")])
            );
        });
    });

    describe("handleGetRecipe", () => {
        it("should return recipe with favorite count", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "1" };

            const mockRecipe = {
                id: 1,
                name: "Test Recipe",
                ingredients: JSON.stringify([{ quantity: "1", unit: "cup", name: "flour" }]),
                steps: JSON.stringify(["Step 1"]),
                macros: null,
                tags: JSON.stringify(["breakfast"]),
                favorite_count: "5"
            };

            mockPool.query.mockResolvedValue({ rows: [mockRecipe] });

            await handleGetRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                recipe: expect.objectContaining({
                    id: 1,
                    name: "Test Recipe",
                    favorite_count: 5
                })
            });
        });

        it("should return 404 if recipe not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "999" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Recipe not found"
            });
        });
    });

    describe("handleCreateRecipe", () => {
        it("should create recipe successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (containsEmoji as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                name: "New Recipe",
                description: "A new recipe",
                ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
                steps: ["Step 1"],
                isPublic: false
            };

            const mockCreatedRecipe = { id: 1, name: "New Recipe" };
            mockPool.query.mockResolvedValue({ rows: [mockCreatedRecipe] });

            await handleCreateRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                recipe: expect.objectContaining({ id: 1 })
            });
        });

        it("should validate recipe name length", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                name: "a".repeat(101),
                ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
                steps: ["Step 1"]
            };

            await handleCreateRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Recipe name must be 100 characters or less"
            });
        });

        it("should validate emoji in recipe name", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (containsEmoji as ReturnType<typeof vi.fn>).mockReturnValue(true);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                name: "Recipe 😀",
                ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
                steps: ["Step 1"]
            };

            await handleCreateRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Recipe name cannot contain emojis"
            });
        });

        it("should ignore invalid servings (negative values are treated as null)", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (containsEmoji as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                name: "Test Recipe",
                ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
                steps: ["Step 1"],
                servings: -1
            };

            const mockCreatedRecipe = { id: 1, name: "Test Recipe", servings: null };
            mockPool.query.mockResolvedValue({ rows: [mockCreatedRecipe] });

            await handleCreateRecipe(mockRequest as Request, mockResponse as Response);

            // Invalid servings are silently ignored and set to null
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                recipe: expect.objectContaining({ id: 1, servings: null })
            });
        });

        it("should create recipe with ingredients without unit (whole items)", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (containsEmoji as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {
                name: "Tortilla Wraps",
                description: "Simple wraps",
                ingredients: [
                    { quantity: 4, name: "wholemeal tortilla wraps" },
                    { quantity: 2, unit: "", name: "eggs" },
                    { quantity: "100", unit: "g", name: "cheese" }
                ],
                steps: ["Prepare wraps"],
                isPublic: false
            };

            const mockCreatedRecipe = { id: 1, name: "Tortilla Wraps" };
            mockPool.query.mockResolvedValue({ rows: [mockCreatedRecipe] });

            await handleCreateRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                recipe: expect.objectContaining({ id: 1 })
            });
        });
    });

    describe("handleUpdateRecipe", () => {
        it("should update recipe successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (containsEmoji as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "1" };
            mockRequest.body = {
                name: "Updated Recipe",
                ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
                steps: ["Step 1"]
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, image_filename: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, name: "Updated Recipe" }] });

            await handleUpdateRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                recipe: expect.objectContaining({ id: 1 })
            });
        });

        it("should remove verified status when updating public recipe", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            (containsEmoji as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "1" };
            mockRequest.body = {
                name: "Updated Recipe",
                ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
                steps: ["Step 1"],
                isPublic: true
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, image_filename: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }] });

            await handleUpdateRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("is_verified = FALSE"),
                expect.any(Array)
            );
        });
    });

    describe("handleDeleteRecipe", () => {
        it("should delete recipe and remove favorites", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "1" };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, image_filename: null }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await handleDeleteRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM favorites"),
                ["1"]
            );
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM recipes"),
                ["1", 1]
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should delete image when recipe has image", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "1" };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, image_filename: "test.jpg" }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await handleDeleteRecipe(mockRequest as Request, mockResponse as Response);

            expect(deleteRecipeImageIfUnused).toHaveBeenCalledWith("test.jpg", 1, mockPool);
        });

        it("should return 404 if recipe not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { recipeId: "999" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleDeleteRecipe(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Recipe not found"
            });
        });
    });
});
