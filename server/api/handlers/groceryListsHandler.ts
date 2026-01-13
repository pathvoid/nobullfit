import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { sendGroceryListEmail } from "../utils/emailService.js";
import {
    parseFraction,
    normalizeUnit,
    areUnitsCompatible,
    addQuantities,
    generateIngredientFoodId,
    formatQuantityForDisplay
} from "../../../src/utils/ingredientUnits.js";

// Helper function to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
        if (cookieToken) {
            token = cookieToken;
        }
    }

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    return decoded ? decoded.userId : null;
}

// Get all grocery lists for user (with items)
export async function handleGetGroceryLists(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get all lists for user
        const listsResult = await pool.query(
            "SELECT id, name, created_at, updated_at FROM grocery_lists WHERE user_id = $1 ORDER BY updated_at DESC",
            [userId]
        );

        // Get items for each list
        const lists = await Promise.all(
            listsResult.rows.map(async (list) => {
                const itemsResult = await pool.query(
                    "SELECT id, food_id, food_label, food_data, quantity, unit, notes, created_at FROM grocery_list_items WHERE list_id = $1 ORDER BY LOWER(food_label) ASC",
                    [list.id]
                );
                return {
                    ...list,
                    items: itemsResult.rows
                };
            })
        );

        res.status(200).json({
            lists
        });
    } catch (error) {
        console.error("Error fetching grocery lists:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Create new grocery list
export async function handleCreateGroceryList(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { name } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({ error: "List name is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const result = await pool.query(
            "INSERT INTO grocery_lists (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at, updated_at",
            [userId, name.trim()]
        );

        res.status(201).json({
            success: true,
            list: {
                ...result.rows[0],
                items: []
            }
        });
    } catch (error) {
        console.error("Error creating grocery list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update grocery list name
export async function handleUpdateGroceryList(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;
        const { name } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({ error: "List name is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const verifyResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        const result = await pool.query(
            "UPDATE grocery_lists SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, name, created_at, updated_at",
            [name.trim(), listId, userId]
        );

        res.status(200).json({
            success: true,
            list: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating grocery list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Delete grocery list
export async function handleDeleteGroceryList(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user and delete (CASCADE will delete items)
        const result = await pool.query(
            "DELETE FROM grocery_lists WHERE id = $1 AND user_id = $2 RETURNING id",
            [listId, userId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        res.status(200).json({
            success: true,
            message: "List deleted"
        });
    } catch (error) {
        console.error("Error deleting grocery list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get items in a grocery list
export async function handleGetGroceryListItems(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const verifyResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        const itemsResult = await pool.query(
            "SELECT id, food_id, food_label, food_data, quantity, notes, created_at FROM grocery_list_items WHERE list_id = $1 ORDER BY LOWER(food_label) ASC",
            [listId]
        );

        res.status(200).json({
            items: itemsResult.rows
        });
    } catch (error) {
        console.error("Error fetching grocery list items:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Helper function to capitalize food labels properly
function capitalizeLabel(label: string): string {
    if (!label) return label;
    // Capitalize first letter of each word, handle special cases
    return label
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Add items to grocery list (supports multiple items for recipes and custom items)
export async function handleAddGroceryListItems(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ error: "Items array is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const verifyResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        // Validate items - foodLabel is required, foodId is optional for custom items
        for (const item of items) {
            if (!item.foodLabel) {
                res.status(400).json({ error: "Each item must have foodLabel" });
                return;
            }
        }

        // Insert or update items (increment quantity if item already exists)
        const insertedItems = [];
        for (const item of items) {
            // Capitalize the food label properly
            const capitalizedLabel = capitalizeLabel(item.foodLabel);
            
            // For custom items without foodId, generate a unique ID
            const foodId = item.foodId || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const isCustomItem = !item.foodId || item.foodId.startsWith("custom_");
            
            // Check if item already exists in this list
            // For custom items, check by label (case-insensitive) and unit
            // For food database items, check by food_id and unit
            // Items with different units should be kept separate
            const itemUnit = item.unit || null;
            let existingResult;
            if (isCustomItem) {
                // For custom items, check by label (case-insensitive) and unit
                if (itemUnit) {
                    existingResult = await pool.query(
                        "SELECT id, quantity, unit FROM grocery_list_items WHERE list_id = $1 AND LOWER(food_label) = LOWER($2) AND LOWER(unit) = LOWER($3)",
                        [listId, capitalizedLabel, itemUnit]
                    );
                } else {
                    existingResult = await pool.query(
                        "SELECT id, quantity, unit FROM grocery_list_items WHERE list_id = $1 AND LOWER(food_label) = LOWER($2) AND unit IS NULL",
                        [listId, capitalizedLabel]
                    );
                }
            } else {
                // For food database items, check by food_id and unit
                if (itemUnit) {
                    existingResult = await pool.query(
                        "SELECT id, quantity, unit FROM grocery_list_items WHERE list_id = $1 AND food_id = $2 AND LOWER(unit) = LOWER($3)",
                        [listId, foodId, itemUnit]
                    );
                } else {
                    existingResult = await pool.query(
                        "SELECT id, quantity, unit FROM grocery_list_items WHERE list_id = $1 AND food_id = $2 AND unit IS NULL",
                        [listId, foodId]
                    );
                }
            }

            if (existingResult.rows.length > 0) {
                // Item exists with same unit, increment quantity and update label to proper capitalization
                const existingItem = existingResult.rows[0];
                const newQuantity = parseFloat(existingItem.quantity) + (item.quantity || 1);
                const updateResult = await pool.query(
                    `UPDATE grocery_list_items 
                     SET quantity = $1, food_label = $2, food_data = COALESCE($3, food_data)
                     WHERE id = $4
                     RETURNING id, food_id, food_label, food_data, quantity, unit, notes, created_at`,
                    [newQuantity, capitalizedLabel, item.foodData || null, existingItem.id]
                );
                insertedItems.push(updateResult.rows[0]);
            } else {
                // Item doesn't exist, insert new
                const result = await pool.query(
                    `INSERT INTO grocery_list_items (list_id, food_id, food_label, food_data, quantity, unit, notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING id, food_id, food_label, food_data, quantity, unit, notes, created_at`,
                    [
                        listId,
                        foodId,
                        capitalizedLabel,
                        item.foodData || null,
                        item.quantity || 1,
                        item.unit || null,
                        item.notes || null
                    ]
                );
                insertedItems.push(result.rows[0]);
            }
        }

        // Update list updated_at
        await pool.query(
            "UPDATE grocery_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [listId]
        );

        res.status(201).json({
            success: true,
            items: insertedItems
        });
    } catch (error) {
        console.error("Error adding grocery list items:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Remove single item from grocery list
export async function handleRemoveGroceryListItem(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId, itemId } = req.params;

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const verifyResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        // Delete item
        const result = await pool.query(
            "DELETE FROM grocery_list_items WHERE id = $1 AND list_id = $2 RETURNING id",
            [itemId, listId]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Item not found" });
            return;
        }

        // Update list updated_at
        await pool.query(
            "UPDATE grocery_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [listId]
        );

        res.status(200).json({
            success: true,
            message: "Item removed"
        });
    } catch (error) {
        console.error("Error removing grocery list item:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Remove multiple items from grocery list (bulk delete)
export async function handleBulkRemoveGroceryListItems(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;
        const { itemIds } = req.body;

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            res.status(400).json({ error: "Item IDs array is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const verifyResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        // Delete items
        const placeholders = itemIds.map((_, index) => `$${index + 2}`).join(", ");
        const result = await pool.query(
            `DELETE FROM grocery_list_items WHERE list_id = $1 AND id IN (${placeholders}) RETURNING id`,
            [listId, ...itemIds]
        );

        // Update list updated_at
        await pool.query(
            "UPDATE grocery_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [listId]
        );

        res.status(200).json({
            success: true,
            message: `${result.rows.length} item(s) removed`,
            removedCount: result.rows.length
        });
    } catch (error) {
        console.error("Error bulk removing grocery list items:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update item quantity (increment or decrement)
export async function handleUpdateGroceryListItemQuantity(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId, itemId } = req.params;
        const { delta } = req.body; // delta should be 1 or -1

        if (delta === undefined || (delta !== 1 && delta !== -1)) {
            res.status(400).json({ error: "Delta must be 1 or -1" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const verifyResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        // Get current quantity
        const itemResult = await pool.query(
            "SELECT id, quantity FROM grocery_list_items WHERE id = $1 AND list_id = $2",
            [itemId, listId]
        );

        if (itemResult.rows.length === 0) {
            res.status(404).json({ error: "Item not found" });
            return;
        }

        const currentQuantity = parseFloat(itemResult.rows[0].quantity);
        const newQuantity = currentQuantity + delta;

        // Ensure quantity never goes below 1
        if (newQuantity < 1) {
            res.status(400).json({ error: "Quantity cannot be less than 1" });
            return;
        }

        // Update quantity
        const updateResult = await pool.query(
            `UPDATE grocery_list_items 
             SET quantity = $1
             WHERE id = $2 AND list_id = $3
             RETURNING id, food_id, food_label, food_data, quantity, notes, created_at`,
            [newQuantity, itemId, listId]
        );

        // Update list updated_at
        await pool.query(
            "UPDATE grocery_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [listId]
        );

        res.status(200).json({
            success: true,
            item: updateResult.rows[0]
        });
    } catch (error) {
        console.error("Error updating grocery list item quantity:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Send grocery list by email
export async function handleSendGroceryListEmail(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user and get user email
        const listResult = await pool.query(
            `SELECT gl.id, gl.name, u.email, u.full_name
             FROM grocery_lists gl
             JOIN users u ON gl.user_id = u.id
             WHERE gl.id = $1 AND gl.user_id = $2`,
            [listId, userId]
        );

        if (listResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        const list = listResult.rows[0];

        // Get items for the list
        const itemsResult = await pool.query(
            "SELECT food_label, food_data, quantity, unit FROM grocery_list_items WHERE list_id = $1 ORDER BY LOWER(food_label) ASC",
            [listId]
        );

        // Send email
        try {
            await sendGroceryListEmail(
                list.email,
                list.full_name || "User",
                list.name,
                itemsResult.rows
            );

            res.status(200).json({
                success: true,
                message: "Grocery list sent successfully to your email."
            });
        } catch (emailError) {
            console.error("Failed to send grocery list email:", emailError);
            res.status(500).json({
                error: "Failed to send email. Please try again later."
            });
        }
    } catch (error) {
        console.error("Error sending grocery list email:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Ingredient type from recipe
interface RecipeIngredient {
    name: string;
    quantity: number | string | null;
    unit: string;
}

// Add recipe ingredients to grocery list with smart quantity aggregation
export async function handleAddRecipeIngredientsToGroceryList(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { listId } = req.params;
        const { recipeId, servings } = req.body;

        if (!recipeId) {
            res.status(400).json({ error: "Recipe ID is required" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify list belongs to user
        const listResult = await pool.query(
            "SELECT id FROM grocery_lists WHERE id = $1 AND user_id = $2",
            [listId, userId]
        );

        if (listResult.rows.length === 0) {
            res.status(404).json({ error: "List not found" });
            return;
        }

        // Get recipe (must be public or belong to user)
        const recipeResult = await pool.query(
            `SELECT id, name, ingredients, servings FROM recipes 
             WHERE id = $1 AND (is_public = TRUE OR user_id = $2)`,
            [recipeId, userId]
        );

        if (recipeResult.rows.length === 0) {
            res.status(404).json({ error: "Recipe not found" });
            return;
        }

        const recipe = recipeResult.rows[0];
        const ingredients: RecipeIngredient[] = typeof recipe.ingredients === "string" 
            ? JSON.parse(recipe.ingredients) 
            : recipe.ingredients;

        // Calculate serving multiplier if specified
        const recipeServings = recipe.servings || 1;
        const targetServings = servings || recipeServings;
        const servingMultiplier = targetServings / recipeServings;

        // Pre-aggregate ingredients by normalized name within the recipe
        // This handles cases like "salt" and "Salt", or "1 cup mayo" and "1/2 cup mayo"
        const aggregatedIngredients = new Map<string, { 
            foodId: string; 
            foodLabel: string; 
            quantity: number; 
            unit: string;
            notes: string[];
        }>();

        for (const ingredient of ingredients) {
            if (!ingredient.name || typeof ingredient.name !== "string") {
                continue;
            }

            const foodId = generateIngredientFoodId(ingredient.name);
            let ingredientQty = parseFraction(ingredient.quantity);
            if (ingredientQty !== null) {
                ingredientQty = ingredientQty * servingMultiplier;
            } else {
                ingredientQty = 1 * servingMultiplier;
            }
            const ingredientUnit = ingredient.unit || "";

            const existing = aggregatedIngredients.get(foodId);
            if (existing) {
                // Try to add the quantities
                if (ingredientUnit && existing.unit) {
                    const addResult = addQuantities(
                        existing.quantity,
                        existing.unit,
                        ingredientQty,
                        ingredientUnit,
                        true
                    );
                    if (addResult !== null) {
                        existing.quantity = addResult.quantity;
                        existing.unit = addResult.unit;
                    } else {
                        // Incompatible units, add as note
                        existing.notes.push(`${formatQuantityForDisplay(ingredientQty, ingredientUnit)} ${ingredientUnit}`);
                    }
                } else {
                    // No unit specified, just add quantities
                    existing.quantity += ingredientQty;
                    if (ingredientUnit && !existing.unit) {
                        existing.unit = ingredientUnit;
                    }
                }
            } else {
                aggregatedIngredients.set(foodId, {
                    foodId,
                    foodLabel: capitalizeLabel(ingredient.name),
                    quantity: ingredientQty,
                    unit: ingredientUnit,
                    notes: []
                });
            }
        }

        // Get existing items in the grocery list
        const existingItemsResult = await pool.query(
            "SELECT id, food_id, food_label, food_data, quantity, unit FROM grocery_list_items WHERE list_id = $1",
            [listId]
        );

        const existingItemsMap = new Map(existingItemsResult.rows.map((item: { food_id: string }) => [item.food_id, item]));
        const updatedItems: Array<{ id: number; food_id: string; food_label: string; quantity: number; unit: string; wasUpdated: boolean }> = [];

        // Process each aggregated ingredient
        for (const [foodId, aggIngredient] of aggregatedIngredients) {
            const foodLabel = aggIngredient.foodLabel;
            const ingredientQty = aggIngredient.quantity;
            const ingredientUnit = aggIngredient.unit;

            // Check if this ingredient already exists in the list
            const existingItem = existingItemsMap.get(foodId) as {
                id: number;
                food_id: string;
                food_label: string;
                food_data: { unit?: string } | null;
                quantity: string;
                unit: string | null;
                notes: string | null;
            } | undefined;

            if (existingItem) {
                // Get existing item's unit
                const existingFoodData = existingItem.food_data || {};
                const existingUnit = existingItem.unit || existingFoodData.unit || "";
                const existingQty = parseFloat(existingItem.quantity) || 0;
                const qtyToAdd = ingredientQty;

                // Try to add quantities with unit conversion
                if (existingQty > 0 && ingredientUnit && existingUnit) {
                    const addResult = addQuantities(
                        existingQty,
                        existingUnit,
                        qtyToAdd,
                        ingredientUnit,
                        true // prefer larger unit
                    );

                    if (addResult !== null) {
                        // Units were compatible, update with combined quantity
                        const newFoodData = {
                            ...existingFoodData,
                            unit: addResult.unit,
                            originalUnit: ingredientUnit,
                            recipeName: recipe.name
                        };

                        await pool.query(
                            `UPDATE grocery_list_items 
                             SET quantity = $1, unit = $2, food_data = $3, food_label = $4
                             WHERE id = $5`,
                            [addResult.quantity, addResult.unit || null, JSON.stringify(newFoodData), foodLabel, existingItem.id]
                        );

                        updatedItems.push({
                            id: existingItem.id,
                            food_id: foodId,
                            food_label: foodLabel,
                            quantity: addResult.quantity,
                            unit: addResult.unit,
                            wasUpdated: true
                        });
                    } else {
                        // Units were incompatible, add as note
                        const notes = existingItem.notes 
                            ? `${existingItem.notes}; +${formatQuantityForDisplay(qtyToAdd, ingredientUnit)} ${ingredientUnit} (from ${recipe.name})`
                            : `+${formatQuantityForDisplay(qtyToAdd, ingredientUnit)} ${ingredientUnit} (from ${recipe.name})`;

                        await pool.query(
                            `UPDATE grocery_list_items 
                             SET notes = $1
                             WHERE id = $2`,
                            [notes, existingItem.id]
                        );

                        updatedItems.push({
                            id: existingItem.id,
                            food_id: foodId,
                            food_label: foodLabel,
                            quantity: existingQty,
                            unit: existingUnit,
                            wasUpdated: true
                        });
                    }
                } else {
                    // No unit conversion needed - just add the quantities
                    const newQty = existingQty + qtyToAdd;
                    const newUnit = ingredientUnit || existingUnit;
                    const newFoodData = {
                        ...existingFoodData,
                        unit: newUnit,
                        recipeName: recipe.name
                    };

                    await pool.query(
                        `UPDATE grocery_list_items 
                         SET quantity = $1, unit = $2, food_data = $3, food_label = $4
                         WHERE id = $5`,
                        [newQty, newUnit || null, JSON.stringify(newFoodData), foodLabel, existingItem.id]
                    );

                    updatedItems.push({
                        id: existingItem.id,
                        food_id: foodId,
                        food_label: foodLabel,
                        quantity: newQty,
                        unit: newUnit,
                        wasUpdated: true
                    });
                }
            } else {
                // New item, insert it
                // When ingredient has no quantity, default to 1 (scaled by serving multiplier)
                const qtyToInsert = ingredientQty !== null ? ingredientQty : (1 * servingMultiplier);
                const foodData = {
                    unit: ingredientUnit,
                    recipeName: recipe.name,
                    recipeId: recipe.id
                };

                const insertResult = await pool.query(
                    `INSERT INTO grocery_list_items (list_id, food_id, food_label, food_data, quantity, unit, notes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING id, food_id, food_label, quantity, unit`,
                    [
                        listId,
                        foodId,
                        foodLabel,
                        JSON.stringify(foodData),
                        qtyToInsert,
                        ingredientUnit || null,
                        null
                    ]
                );

                updatedItems.push({
                    id: insertResult.rows[0].id,
                    food_id: foodId,
                    food_label: foodLabel,
                    quantity: qtyToInsert,
                    unit: ingredientUnit,
                    wasUpdated: false
                });
            }
        }

        // Update list updated_at
        await pool.query(
            "UPDATE grocery_lists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [listId]
        );

        res.status(200).json({
            success: true,
            message: `Added ${updatedItems.length} ingredients from "${recipe.name}" to your grocery list`,
            items: updatedItems,
            recipeName: recipe.name
        });
    } catch (error) {
        console.error("Error adding recipe ingredients to grocery list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}