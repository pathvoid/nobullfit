import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleGetGroceryLists,
    handleCreateGroceryList,
    handleUpdateGroceryList,
    handleDeleteGroceryList,
    handleAddGroceryListItems,
    handleRemoveGroceryListItem,
    handleUpdateGroceryListItemQuantity,
    handleAddRecipeIngredientsToGroceryList
} from "./groceryListsHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/emailService", () => ({
    sendGroceryListEmail: vi.fn()
}));

vi.mock("../../../src/utils/ingredientUnits", () => ({
    parseFraction: vi.fn((val: string | number | null) => {
        if (val === null) return null;
        if (typeof val === "number") return val;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    }),
    normalizeUnit: vi.fn((unit: string) => unit?.toLowerCase() || null),
    areUnitsCompatible: vi.fn((u1: string, u2: string) => {
        const volumeUnits = ["ml", "l", "cup", "tbsp", "tsp"];
        const weightUnits = ["g", "kg", "oz", "lb"];
        const isVol1 = volumeUnits.includes(u1?.toLowerCase());
        const isVol2 = volumeUnits.includes(u2?.toLowerCase());
        const isWeight1 = weightUnits.includes(u1?.toLowerCase());
        const isWeight2 = weightUnits.includes(u2?.toLowerCase());
        return (isVol1 && isVol2) || (isWeight1 && isWeight2) || u1 === u2;
    }),
    addQuantities: vi.fn((q1: number, u1: string, q2: number, u2: string) => {
        if (u1 === u2) return { quantity: q1 + q2, unit: u1 };
        // Simple conversion mock: L to ml
        if (u1 === "l" && u2 === "ml") return { quantity: q1 + q2 / 1000, unit: "l" };
        if (u1 === "ml" && u2 === "l") return { quantity: q1 / 1000 + q2, unit: "l" };
        return null;
    }),
    generateIngredientFoodId: vi.fn((name: string) => `ingredient_${name.toLowerCase().replace(/\s+/g, "_")}`),
    formatQuantityForDisplay: vi.fn((qty: number) => qty.toString())
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("groceryListsHandler", () => {
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

    describe("handleGetGroceryLists", () => {
        it("should return user grocery lists", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };

            // Get lists
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, name: "Weekly Groceries", created_at: new Date(), updated_at: new Date() }]
            });
            // Get items for list 1
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, food_id: "food1", food_label: "Apple", quantity: 2 }]
            });

            await handleGetGroceryLists(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                lists: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        name: "Weekly Groceries",
                        items: expect.any(Array)
                    })
                ])
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetGroceryLists(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe("handleCreateGroceryList", () => {
        it("should create a grocery list successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = { name: "Shopping List" };

            mockPool.query.mockResolvedValue({
                rows: [{ id: 1, name: "Shopping List", created_at: new Date(), updated_at: new Date() }]
            });

            await handleCreateGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                list: expect.objectContaining({
                    id: 1,
                    name: "Shopping List",
                    items: []
                })
            });
        });

        it("should return 400 if name is missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {};

            await handleCreateGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "List name is required"
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleCreateGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
    });

    describe("handleUpdateGroceryList", () => {
        it("should update a grocery list name successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { name: "Updated List" };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Update list
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, name: "Updated List", created_at: new Date(), updated_at: new Date() }]
            });

            await handleUpdateGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                list: expect.objectContaining({ name: "Updated List" })
            });
        });

        it("should return 404 if list not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "999" };
            mockRequest.body = { name: "Updated List" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleUpdateGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "List not found"
            });
        });
    });

    describe("handleDeleteGroceryList", () => {
        it("should delete a grocery list successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };

            mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await handleDeleteGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "List deleted"
            });
        });

        it("should return 404 if list not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "999" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleDeleteGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "List not found"
            });
        });
    });

    describe("handleAddGroceryListItems", () => {
        it("should add items to a grocery list successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = {
                items: [
                    { foodId: "food1", foodLabel: "Apple", quantity: 2 }
                ]
            };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Check if item exists (it doesn't)
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Insert item
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, food_id: "food1", food_label: "Apple", quantity: 2 }]
            });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleAddGroceryListItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                items: expect.any(Array)
            });
        });

        it("should return 400 if items array is missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = {};

            await handleAddGroceryListItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Items array is required"
            });
        });

        it("should return 404 if list not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "999" };
            mockRequest.body = {
                items: [{ foodId: "food1", foodLabel: "Apple" }]
            };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleAddGroceryListItems(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "List not found"
            });
        });
    });

    describe("handleRemoveGroceryListItem", () => {
        it("should remove an item from grocery list successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1", itemId: "1" };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Delete item
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleRemoveGroceryListItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Item removed"
            });
        });

        it("should return 404 if item not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1", itemId: "999" };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Item not found
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleRemoveGroceryListItem(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Item not found"
            });
        });
    });

    describe("handleUpdateGroceryListItemQuantity", () => {
        it("should increase item quantity successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1", itemId: "1" };
            mockRequest.body = { delta: 1 };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Get current quantity
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, quantity: 2 }] });
            // Update quantity
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, food_id: "food1", food_label: "Apple", quantity: 3 }]
            });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleUpdateGroceryListItemQuantity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                item: expect.objectContaining({ quantity: 3 })
            });
        });

        it("should return 400 if delta is invalid", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1", itemId: "1" };
            mockRequest.body = { delta: 5 };

            await handleUpdateGroceryListItemQuantity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Delta must be 1 or -1"
            });
        });

        it("should return 400 if quantity would go below 1", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1", itemId: "1" };
            mockRequest.body = { delta: -1 };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Get current quantity (already 1)
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, quantity: 1 }] });

            await handleUpdateGroceryListItemQuantity(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Quantity cannot be less than 1"
            });
        });
    });

    describe("handleAddRecipeIngredientsToGroceryList", () => {
        it("should add recipe ingredients to grocery list", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { recipeId: "1" };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Get recipe
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    name: "Orange Juice Recipe",
                    ingredients: JSON.stringify([
                        { name: "Orange Juice", quantity: 1, unit: "l" },
                        { name: "Sugar", quantity: 100, unit: "g" }
                    ]),
                    servings: 2
                }]
            });
            // Get existing items (empty)
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Insert first ingredient
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, food_id: "ingredient_orange_juice", food_label: "Orange Juice", quantity: 1 }]
            });
            // Insert second ingredient
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 2, food_id: "ingredient_sugar", food_label: "Sugar", quantity: 100 }]
            });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                items: expect.any(Array)
            }));
        });

        it("should aggregate quantities when ingredient already exists with same unit", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { recipeId: "1" };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Get recipe
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    name: "Juice Recipe",
                    ingredients: JSON.stringify([
                        { name: "Orange Juice", quantity: 500, unit: "ml" }
                    ]),
                    servings: 1
                }]
            });
            // Get existing items - already has Orange Juice with 500ml
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    food_id: "ingredient_orange_juice",
                    food_label: "Orange Juice",
                    food_data: { unit: "ml" },
                    quantity: 500
                }]
            });
            // Update existing item
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should convert units when adding compatible units", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { recipeId: "1" };

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Get recipe - has 100ml
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    name: "Juice Recipe",
                    ingredients: JSON.stringify([
                        { name: "Orange Juice", quantity: 100, unit: "ml" }
                    ]),
                    servings: 1
                }]
            });
            // Get existing items - already has 1L Orange Juice
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    food_id: "ingredient_orange_juice",
                    food_label: "Orange Juice",
                    food_data: { unit: "l" },
                    quantity: 1
                }]
            });
            // Update with converted quantity
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should scale quantities based on servings", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { recipeId: "1", servings: 4 }; // Double the recipe

            // Verify list belongs to user
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Get recipe (serves 2)
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    name: "Juice Recipe",
                    ingredients: JSON.stringify([
                        { name: "Orange Juice", quantity: 1, unit: "l" }
                    ]),
                    servings: 2
                }]
            });
            // Get existing items (empty)
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Insert with scaled quantity (should be 2L for 4 servings)
            mockPool.query.mockResolvedValueOnce({
                rows: [{ id: 1, food_id: "ingredient_orange_juice", food_label: "Orange Juice", quantity: 2 }]
            });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });

        it("should return 400 if recipeId is missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = {};

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Recipe ID is required"
            });
        });

        it("should return 404 if list not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "999" };
            mockRequest.body = { recipeId: "1" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "List not found"
            });
        });

        it("should return 404 if recipe not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { recipeId: "999" };

            // List exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Recipe not found
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Recipe not found"
            });
        });

        it("should increment quantity when ingredient has no quantity and already exists", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.params = { listId: "1" };
            mockRequest.body = { recipeId: "1" };

            // Recipe with ingredient that has no quantity specified
            const ingredientsWithNoQty = [
                { name: "Bay Leaf", quantity: null, unit: "" }
            ];

            // List exists
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
            // Recipe exists with ingredient without quantity
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    name: "Test Recipe",
                    ingredients: JSON.stringify(ingredientsWithNoQty),
                    servings: 1
                }]
            });
            // Existing items - ingredient already exists with quantity 1
            // Note: food_id is generated by normalizing the name (lowercased, spaces to underscores)
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 100,
                    food_id: "ingredient_bay_leaf",
                    food_label: "Bay Leaf",
                    quantity: "1",
                    food_data: { unit: "" }
                }]
            });
            // Update query
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
            // Update list timestamp
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

            await handleAddRecipeIngredientsToGroceryList(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            food_label: "Bay Leaf",
                            quantity: 2, // 1 existing + 1 default for no quantity
                            wasUpdated: true
                        })
                    ])
                })
            );
        });
    });
});
