import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleExportData } from "./exportDataHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("exportDataHandler", () => {
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
            headers: {},
            cookies: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn().mockReturnThis()
        };
    });

    it("should export user data successfully", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            country: "US",
            terms_accepted: true,
            terms_accepted_at: "2024-01-01T00:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
        };

        const mockRecipes = [
            {
                id: 1,
                name: "Test Recipe",
                description: "A test recipe",
                ingredients: JSON.stringify([{ quantity: "1", unit: "cup", name: "flour" }]),
                steps: JSON.stringify(["Step 1"]),
                image_filename: null,
                macros: null,
                servings: 4,
                cooking_time_minutes: 30,
                tags: JSON.stringify(["breakfast"]),
                is_public: true,
                is_verified: false,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z"
            }
        ];

        const mockFavorites = [
            {
                id: 1,
                food_id: "food123",
                food_label: "Test Food",
                food_data: JSON.stringify({ nutrients: {} }),
                item_type: "food"
            }
        ];

        const mockGroceryLists = [
            {
                id: 1,
                name: "Shopping List",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z"
            }
        ];

        const mockGroceryListItems = [
            {
                id: 1,
                food_id: "food123",
                food_label: "Test Food",
                food_data: JSON.stringify({ nutrients: {} }),
                quantity: 1,
                notes: null
            }
        ];

        // Mock all required queries in order:
        // 1. User, 2. Recipes, 3. Favorites, 4. Grocery Lists, 5. Grocery List Items (for each list)
        // 6. Food Tracking, 7. Progress Tracking, 8. Weight Tracking, 9. TDEE, 10. User Settings
        mockPool.query
            .mockResolvedValueOnce({ rows: [mockUser] })
            .mockResolvedValueOnce({ rows: mockRecipes })
            .mockResolvedValueOnce({ rows: mockFavorites })
            .mockResolvedValueOnce({ rows: mockGroceryLists })
            .mockResolvedValueOnce({ rows: mockGroceryListItems })
            .mockResolvedValueOnce({ rows: [] }) // food_tracking
            .mockResolvedValueOnce({ rows: [] }) // progress_tracking
            .mockResolvedValueOnce({ rows: [] }) // weight_tracking
            .mockResolvedValueOnce({ rows: [] }) // tdee
            .mockResolvedValueOnce({ rows: [{ quick_add_days: 30 }] }); // user_settings

        await handleExportData(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
            "Content-Disposition",
            expect.stringContaining("attachment")
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                export_date: expect.any(String),
                user: expect.objectContaining({
                    id: 1,
                    email: "test@example.com"
                }),
                settings: expect.objectContaining({
                    quick_add_days: 30
                }),
                recipes: expect.any(Array),
                favorites: expect.any(Array),
                grocery_lists: expect.any(Array),
                food_tracking: expect.any(Array),
                progress_tracking: expect.any(Array),
                weight_tracking: expect.any(Array),
                summary: expect.objectContaining({
                    total_recipes: expect.any(Number),
                    total_favorites: expect.any(Number),
                    total_grocery_lists: expect.any(Number),
                    total_grocery_list_items: expect.any(Number),
                    total_food_tracking_entries: expect.any(Number),
                    total_progress_tracking_entries: expect.any(Number),
                    total_weight_tracking_entries: expect.any(Number),
                    has_tdee_data: expect.any(Boolean)
                })
            })
        );
    });

    it("should return 401 if not authenticated", async () => {
        mockRequest.headers = {};
        mockRequest.cookies = {};

        await handleExportData(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Authentication required."
        });
    });

    it("should return 404 if user not found", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 999, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };

        mockPool.query.mockResolvedValue({ rows: [] });

        await handleExportData(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "User not found."
        });
    });

    it("should include grocery list items in export", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            country: null,
            terms_accepted: true,
            terms_accepted_at: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
        };

        const mockGroceryLists = [
            {
                id: 1,
                name: "Shopping List",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z"
            }
        ];

        const mockGroceryListItems = [
            {
                id: 1,
                food_id: "food123",
                food_label: "Test Food",
                food_data: null,
                quantity: 2,
                notes: "Buy organic"
            }
        ];

        // Mock all required queries in order:
        // 1. User, 2. Recipes, 3. Favorites, 4. Grocery Lists, 5. Grocery List Items (for each list)
        // 6. Food Tracking, 7. Progress Tracking, 8. Weight Tracking, 9. TDEE, 10. User Settings
        mockPool.query
            .mockResolvedValueOnce({ rows: [mockUser] })
            .mockResolvedValueOnce({ rows: [] }) // recipes
            .mockResolvedValueOnce({ rows: [] }) // favorites
            .mockResolvedValueOnce({ rows: mockGroceryLists })
            .mockResolvedValueOnce({ rows: mockGroceryListItems })
            .mockResolvedValueOnce({ rows: [] }) // food_tracking
            .mockResolvedValueOnce({ rows: [] }) // progress_tracking
            .mockResolvedValueOnce({ rows: [] }) // weight_tracking
            .mockResolvedValueOnce({ rows: [] }) // tdee
            .mockResolvedValueOnce({ rows: [{ quick_add_days: 30 }] }); // user_settings

        await handleExportData(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                grocery_lists: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        items: expect.arrayContaining([
                            expect.objectContaining({
                                quantity: 2,
                                notes: "Buy organic"
                            })
                        ])
                    })
                ])
            })
        );
    });
});
