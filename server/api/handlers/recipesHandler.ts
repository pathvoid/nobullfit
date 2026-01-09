import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { deleteRecipeImageIfUnused } from "../utils/r2Service.js";
import { containsEmoji } from "../utils/emojiValidation.js";

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

// Get recipes (public recipes + user's own recipes)
export async function handleGetRecipes(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        const { search, tags, verified, myRecipes, page, limit } = req.query;
        
        // Parse pagination parameters
        const pageNum = page ? parseInt(String(page), 10) : 1;
        const limitNum = limit ? parseInt(String(limit), 10) : 10;
        const offset = (pageNum - 1) * limitNum;
        
        // Validate pagination parameters
        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            res.status(400).json({ error: "Invalid pagination parameters" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Build WHERE clause based on filters
        let whereClause = "";
        const params: unknown[] = [];
        let paramIndex = 1;

        if (myRecipes === "true" && userId) {
            // Show only user's recipes (both public and private)
            whereClause = `r.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        } else if (userId) {
            // Show public recipes OR user's own recipes
            whereClause = `(r.is_public = TRUE OR r.user_id = $${paramIndex})`;
            params.push(userId);
            paramIndex++;
        } else {
            // Show only public recipes
            whereClause = "r.is_public = TRUE";
        }

        let query = `
            SELECT r.id, r.name, r.description, r.ingredients, r.steps, r.image_filename, r.macros, r.servings, r.cooking_time_minutes, r.tags, r.is_public, r.is_verified, r.created_at, r.updated_at, r.user_id,
                   u.full_name as author_name
            FROM recipes r
            JOIN users u ON r.user_id = u.id
            WHERE ${whereClause}
        `;

        // Filter by verified recipes
        if (verified === "true") {
            query += " AND r.is_verified = TRUE";
        }

        // Filter by tags (recipe must have at least one of the selected tags)
        if (tags && typeof tags === "string") {
            const tagArray = tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
            if (tagArray.length > 0) {
                query += " AND (";
                const tagConditions: string[] = [];
                for (const tag of tagArray) {
                    tagConditions.push("r.tags @> $" + paramIndex + "::jsonb");
                    params.push(JSON.stringify([tag]));
                    paramIndex++;
                }
                query += tagConditions.join(" OR ");
                query += ")";
            }
        }

        // Search filter
        if (search && typeof search === "string" && search.trim().length > 0) {
            const searchParam = `%${search.trim().toLowerCase()}%`;
            query += ` AND (LOWER(r.name) LIKE $${paramIndex} OR LOWER(r.description) LIKE $${paramIndex})`;
            params.push(searchParam);
            paramIndex++;
        }

        query += " ORDER BY r.created_at DESC";

        // Fetch all results for deduplication (we'll paginate after deduplication)
        const result = await pool.query(query, params);

        // Parse JSONB fields
        const recipes = result.rows.map((row: unknown) => {
            const recipe = row as {
                tags: string | unknown[];
                macros: string | unknown;
                ingredients: string | unknown[];
                steps: string | unknown[];
                [key: string]: unknown;
            };
            if (recipe.tags && typeof recipe.tags === "string") {
                try {
                    recipe.tags = JSON.parse(recipe.tags);
                } catch {
                    recipe.tags = [];
                }
            }
            if (recipe.macros && typeof recipe.macros === "string") {
                try {
                    recipe.macros = JSON.parse(recipe.macros);
                } catch {
                    recipe.macros = null;
                }
            }
            if (recipe.ingredients && typeof recipe.ingredients === "string") {
                try {
                    recipe.ingredients = JSON.parse(recipe.ingredients);
                } catch {
                    recipe.ingredients = [];
                }
            }
            if (recipe.steps && typeof recipe.steps === "string") {
                try {
                    recipe.steps = JSON.parse(recipe.steps);
                } catch {
                    recipe.steps = [];
                }
            }
            return recipe;
        });

        // Deduplicate recipes based on all fields (except id, created_at, updated_at, user_id)
        const seen = new Map<string, number[]>();
        const uniqueRecipes: typeof recipes = [];

        for (const recipe of recipes) {
            // Create a signature based on all relevant fields
            const signature = JSON.stringify({
                name: recipe.name,
                description: recipe.description,
                ingredients: recipe.ingredients || [],
                steps: recipe.steps || [],
                macros: recipe.macros,
                servings: recipe.servings,
                cooking_time_minutes: recipe.cooking_time_minutes,
                tags: Array.isArray(recipe.tags) ? [...recipe.tags].sort() : []
            });

            if (!seen.has(signature)) {
                seen.set(signature, []);
                uniqueRecipes.push(recipe);
            }
            // Keep track of duplicate IDs for reference
            const ids = seen.get(signature);
            if (ids) {
                ids.push(recipe.id as number);
            }
        }

        // Apply pagination after deduplication
        const totalCount = uniqueRecipes.length;
        const paginatedRecipes = uniqueRecipes.slice(offset, offset + limitNum);
        const totalPages = Math.ceil(totalCount / limitNum);

        res.status(200).json({
            recipes: paginatedRecipes,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: totalPages
            }
        });
    } catch (error) {
        console.error("Error fetching recipes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get single recipe by ID
export async function handleGetRecipe(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        const { recipeId } = req.params;

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get recipe - must be public OR belong to the user
        // Convert recipeId to string for the favorites subquery (food_id is VARCHAR)
        const recipeIdStr = String(recipeId);
        const result = await pool.query(
            `SELECT r.id, r.name, r.description, r.ingredients, r.steps, r.image_filename, r.macros, r.servings, r.cooking_time_minutes, r.tags, r.is_public, r.is_verified,
                    r.created_at, r.updated_at, r.user_id,
                    u.full_name as author_name,
                    (SELECT COUNT(*) FROM favorites WHERE food_id = $${userId ? "3" : "2"} AND item_type = 'recipe')::int as favorite_count
             FROM recipes r
             JOIN users u ON r.user_id = u.id
             WHERE r.id = $1 AND (r.is_public = TRUE ${userId ? "OR r.user_id = $2" : ""})`,
            userId ? [recipeId, userId, recipeIdStr] : [recipeId, recipeIdStr]
        );

        if (result.rows.length === 0) {
            res.status(404).json({ error: "Recipe not found" });
            return;
        }

        const recipe = result.rows[0];
        // Parse JSONB fields
        recipe.ingredients = typeof recipe.ingredients === "string" ? JSON.parse(recipe.ingredients) : recipe.ingredients;
        recipe.steps = typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : recipe.steps;
        recipe.macros = recipe.macros && typeof recipe.macros === "string" ? JSON.parse(recipe.macros) : recipe.macros;
        recipe.tags = recipe.tags && typeof recipe.tags === "string" ? JSON.parse(recipe.tags) : recipe.tags;
        recipe.favorite_count = parseInt(recipe.favorite_count, 10) || 0;

        res.status(200).json({
            recipe
        });
    } catch (error) {
        console.error("Error fetching recipe:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Create new recipe
export async function handleCreateRecipe(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { name, description, ingredients, steps, imageFilename, macros, servings, cookingTimeMinutes, tags, isPublic } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({ error: "Recipe name is required" });
            return;
        }

        const trimmedName = name.trim();
        if (trimmedName.length > 100) {
            res.status(400).json({ error: "Recipe name must be 100 characters or less" });
            return;
        }
        if (containsEmoji(trimmedName)) {
            res.status(400).json({ error: "Recipe name cannot contain emojis" });
            return;
        }

        const trimmedDescription = description?.trim() || null;
        if (description && typeof description === "string" && trimmedDescription && trimmedDescription.length > 2000) {
            res.status(400).json({ error: "Description must be 2000 characters or less" });
            return;
        }
        if (trimmedDescription && containsEmoji(trimmedDescription)) {
            res.status(400).json({ error: "Description cannot contain emojis" });
            return;
        }

        if (!Array.isArray(ingredients)) {
            res.status(400).json({ error: "Ingredients must be an array" });
            return;
        }

        // Validate each ingredient (supports both old string format and new structured format)
        for (let i = 0; i < ingredients.length; i++) {
            const ingredient = ingredients[i];
            
            // Handle old string format
            if (typeof ingredient === "string") {
                if (ingredient.length > 500) {
                    res.status(400).json({ error: `Ingredient ${i + 1} must be 500 characters or less` });
                    return;
                }
                if (containsEmoji(ingredient)) {
                    res.status(400).json({ error: `Ingredient ${i + 1} cannot contain emojis` });
                    return;
                }
            }
            // Handle new structured format
            else if (typeof ingredient === "object" && ingredient !== null) {
                if (!("name" in ingredient) || typeof ingredient.name !== "string") {
                    res.status(400).json({ error: `Ingredient ${i + 1} must have a name` });
                    return;
                }
                if (ingredient.name.length > 500) {
                    res.status(400).json({ error: `Ingredient ${i + 1} name must be 500 characters or less` });
                    return;
                }
                if (containsEmoji(ingredient.name)) {
                    res.status(400).json({ error: `Ingredient ${i + 1} name cannot contain emojis` });
                    return;
                }
                // Validate unit if provided
                if ("unit" in ingredient && typeof ingredient.unit !== "string") {
                    res.status(400).json({ error: `Ingredient ${i + 1} unit must be a string` });
                    return;
                }
                // Validate quantity if provided (can be number, string fraction, or null)
                if ("quantity" in ingredient && ingredient.quantity !== null) {
                    const quantity = ingredient.quantity;
                    if (typeof quantity !== "number" && typeof quantity !== "string") {
                        res.status(400).json({ error: `Ingredient ${i + 1} quantity must be a number, fraction string, or null` });
                        return;
                    }
                    // If it's a string, validate it's a valid fraction or number format
                    if (typeof quantity === "string") {
                        const quantityStr = quantity.trim();
                        if (quantityStr !== "") {
                            const validNumber = /^\d*\.?\d+$/.test(quantityStr);
                            const validFraction = /^\d+\/\d+$/.test(quantityStr);
                            const validMixed = /^\d+\s+\d+\/\d+$/.test(quantityStr);
                            
                            if (!validNumber && !validFraction && !validMixed) {
                                res.status(400).json({ error: `Ingredient ${i + 1} quantity has invalid format. Use a number (e.g., 1, 2.5) or fraction (e.g., 1/3, 2 1/2)` });
                                return;
                            }
                        }
                    }
                }
            } else {
                res.status(400).json({ error: `Ingredient ${i + 1} must be a string or object` });
                return;
            }
        }

        if (!Array.isArray(steps)) {
            res.status(400).json({ error: "Steps must be an array" });
            return;
        }

        // Validate each step
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (typeof step !== "string") {
                res.status(400).json({ error: `Step ${i + 1} must be a string` });
                return;
            }
            if (step.length > 1000) {
                res.status(400).json({ error: `Step ${i + 1} must be 1000 characters or less` });
                return;
            }
            if (containsEmoji(step)) {
                res.status(400).json({ error: `Step ${i + 1} cannot contain emojis` });
                return;
            }
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Validate macros if provided
        let macrosJson = null;
        if (macros && typeof macros === "object") {
            // Remove undefined values and validate numbers
            const cleanedMacros: Record<string, number> = {};
            for (const [key, value] of Object.entries(macros)) {
                if (value !== undefined && value !== null) {
                    const numValue = typeof value === "number" ? value : parseFloat(value as string);
                    if (!isNaN(numValue) && numValue >= 0) {
                        cleanedMacros[key] = numValue;
                    }
                }
            }
            macrosJson = Object.keys(cleanedMacros).length > 0 ? JSON.stringify(cleanedMacros) : null;
        }

        // Validate and prepare servings
        let servingsValue = null;
        if (servings !== undefined && servings !== null) {
            const servingsNum = typeof servings === "number" ? servings : parseInt(servings as string, 10);
            if (!isNaN(servingsNum) && servingsNum > 0) {
                servingsValue = servingsNum;
            }
        }

        // Validate and prepare cooking time
        let cookingTimeValue = null;
        if (cookingTimeMinutes !== undefined && cookingTimeMinutes !== null) {
            const cookingTimeNum = typeof cookingTimeMinutes === "number" ? cookingTimeMinutes : parseInt(cookingTimeMinutes as string, 10);
            if (!isNaN(cookingTimeNum) && cookingTimeNum > 0) {
                cookingTimeValue = cookingTimeNum;
            }
        }

        // Validate and prepare tags
        let tagsJson = null;
        if (tags && Array.isArray(tags) && tags.length > 0) {
            // Validate tags are strings
            const validTags = tags.filter(tag => typeof tag === "string");
            if (validTags.length > 0) {
                tagsJson = JSON.stringify(validTags);
            }
        }

        const result = await pool.query(
            `INSERT INTO recipes (user_id, name, description, ingredients, steps, image_filename, macros, servings, cooking_time_minutes, tags, is_public, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE)
             RETURNING id, name, description, ingredients, steps, image_filename, macros, servings, cooking_time_minutes, tags, is_public, is_verified, created_at, updated_at`,
            [
                userId,
                trimmedName,
                trimmedDescription,
                JSON.stringify(ingredients),
                JSON.stringify(steps),
                imageFilename || null,
                macrosJson,
                servingsValue,
                cookingTimeValue,
                tagsJson,
                isPublic === true
            ]
        );

        res.status(201).json({
            success: true,
            recipe: result.rows[0]
        });
    } catch (error: unknown) {
        console.error("Error creating recipe:", error);
        // Handle database constraint errors
        if (error && typeof error === "object" && "code" in error) {
            const dbError = error as { code: string; message?: string };
            if (dbError.code === "22001") {
                res.status(400).json({ error: "One or more fields exceed the maximum length allowed" });
                return;
            }
        }
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update recipe
export async function handleUpdateRecipe(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { recipeId } = req.params;
        const { name, description, ingredients, steps, imageFilename, macros, servings, cookingTimeMinutes, tags, isPublic } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            res.status(400).json({ error: "Recipe name is required" });
            return;
        }

        const trimmedName = name.trim();
        if (trimmedName.length > 100) {
            res.status(400).json({ error: "Recipe name must be 100 characters or less" });
            return;
        }
        if (containsEmoji(trimmedName)) {
            res.status(400).json({ error: "Recipe name cannot contain emojis" });
            return;
        }

        if (description && typeof description === "string" && description.trim().length > 2000) {
            res.status(400).json({ error: "Description must be 2000 characters or less" });
            return;
        }

        if (!Array.isArray(ingredients)) {
            res.status(400).json({ error: "Ingredients must be an array" });
            return;
        }

        // Validate each ingredient (supports both old string format and new structured format)
        for (let i = 0; i < ingredients.length; i++) {
            const ingredient = ingredients[i];
            
            // Handle old string format
            if (typeof ingredient === "string") {
                if (ingredient.length > 500) {
                    res.status(400).json({ error: `Ingredient ${i + 1} must be 500 characters or less` });
                    return;
                }
                if (containsEmoji(ingredient)) {
                    res.status(400).json({ error: `Ingredient ${i + 1} cannot contain emojis` });
                    return;
                }
            }
            // Handle new structured format
            else if (typeof ingredient === "object" && ingredient !== null) {
                if (!("name" in ingredient) || typeof ingredient.name !== "string") {
                    res.status(400).json({ error: `Ingredient ${i + 1} must have a name` });
                    return;
                }
                if (ingredient.name.length > 500) {
                    res.status(400).json({ error: `Ingredient ${i + 1} name must be 500 characters or less` });
                    return;
                }
                if (containsEmoji(ingredient.name)) {
                    res.status(400).json({ error: `Ingredient ${i + 1} name cannot contain emojis` });
                    return;
                }
                // Validate unit if provided
                if ("unit" in ingredient && typeof ingredient.unit !== "string") {
                    res.status(400).json({ error: `Ingredient ${i + 1} unit must be a string` });
                    return;
                }
                // Validate quantity if provided (can be number, string fraction, or null)
                if ("quantity" in ingredient && ingredient.quantity !== null) {
                    const quantity = ingredient.quantity;
                    if (typeof quantity !== "number" && typeof quantity !== "string") {
                        res.status(400).json({ error: `Ingredient ${i + 1} quantity must be a number, fraction string, or null` });
                        return;
                    }
                    // If it's a string, validate it's a valid fraction or number format
                    if (typeof quantity === "string") {
                        const quantityStr = quantity.trim();
                        if (quantityStr !== "") {
                            const validNumber = /^\d*\.?\d+$/.test(quantityStr);
                            const validFraction = /^\d+\/\d+$/.test(quantityStr);
                            const validMixed = /^\d+\s+\d+\/\d+$/.test(quantityStr);
                            
                            if (!validNumber && !validFraction && !validMixed) {
                                res.status(400).json({ error: `Ingredient ${i + 1} quantity has invalid format. Use a number (e.g., 1, 2.5) or fraction (e.g., 1/3, 2 1/2)` });
                                return;
                            }
                        }
                    }
                }
            } else {
                res.status(400).json({ error: `Ingredient ${i + 1} must be a string or object` });
                return;
            }
        }

        if (!Array.isArray(steps)) {
            res.status(400).json({ error: "Steps must be an array" });
            return;
        }

        // Validate each step
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (typeof step !== "string") {
                res.status(400).json({ error: `Step ${i + 1} must be a string` });
                return;
            }
            if (step.length > 1000) {
                res.status(400).json({ error: `Step ${i + 1} must be 1000 characters or less` });
                return;
            }
            if (containsEmoji(step)) {
                res.status(400).json({ error: `Step ${i + 1} cannot contain emojis` });
                return;
            }
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify recipe belongs to user and get current image filename and is_public status
        const verifyResult = await pool.query(
            "SELECT id, image_filename, is_public FROM recipes WHERE id = $1 AND user_id = $2",
            [recipeId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "Recipe not found" });
            return;
        }

        const oldImageFilename = verifyResult.rows[0].image_filename;
        const wasPublic = verifyResult.rows[0].is_public;
        const newImageFilename = imageFilename || null;

        // Delete old image if it's being replaced or removed (only if not used by other recipes)
        if (oldImageFilename && oldImageFilename !== newImageFilename) {
            await deleteRecipeImageIfUnused(oldImageFilename, parseInt(recipeId, 10), pool);
        }

        // Validate macros if provided
        let macrosJson = null;
        if (macros && typeof macros === "object") {
            // Remove undefined values and validate numbers
            const cleanedMacros: Record<string, number> = {};
            for (const [key, value] of Object.entries(macros)) {
                if (value !== undefined && value !== null) {
                    const numValue = typeof value === "number" ? value : parseFloat(value as string);
                    if (!isNaN(numValue) && numValue >= 0) {
                        cleanedMacros[key] = numValue;
                    }
                }
            }
            macrosJson = Object.keys(cleanedMacros).length > 0 ? JSON.stringify(cleanedMacros) : null;
        }

        // Validate and prepare servings
        let servingsValue = null;
        if (servings !== undefined && servings !== null) {
            const servingsNum = typeof servings === "number" ? servings : parseInt(servings as string, 10);
            if (!isNaN(servingsNum) && servingsNum > 0) {
                servingsValue = servingsNum;
            }
        }

        // Validate and prepare cooking time
        let cookingTimeValue = null;
        if (cookingTimeMinutes !== undefined && cookingTimeMinutes !== null) {
            const cookingTimeNum = typeof cookingTimeMinutes === "number" ? cookingTimeMinutes : parseInt(cookingTimeMinutes as string, 10);
            if (!isNaN(cookingTimeNum) && cookingTimeNum > 0) {
                cookingTimeValue = cookingTimeNum;
            }
        }

        // Validate and prepare tags
        let tagsJson = null;
        if (tags && Array.isArray(tags) && tags.length > 0) {
            // Validate tags are strings
            const validTags = tags.filter(tag => typeof tag === "string");
            if (validTags.length > 0) {
                tagsJson = JSON.stringify(validTags);
            }
        }

        const result = await pool.query(
            `UPDATE recipes 
             SET name = $1, description = $2, ingredients = $3, steps = $4, image_filename = $5, macros = $6, servings = $7, cooking_time_minutes = $8, tags = $9, is_public = $10, is_verified = FALSE, updated_at = CURRENT_TIMESTAMP
             WHERE id = $11 AND user_id = $12
             RETURNING id, name, description, ingredients, steps, image_filename, macros, servings, cooking_time_minutes, tags, is_public, is_verified, created_at, updated_at`,
            [
                trimmedName,
                description?.trim() || null,
                JSON.stringify(ingredients),
                JSON.stringify(steps),
                newImageFilename,
                macrosJson,
                servingsValue,
                cookingTimeValue,
                tagsJson,
                isPublic === true,
                recipeId,
                userId
            ]
        );

        const recipe = result.rows[0];
        // Parse JSONB fields
        recipe.ingredients = typeof recipe.ingredients === "string" ? JSON.parse(recipe.ingredients) : recipe.ingredients;
        recipe.steps = typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : recipe.steps;
        recipe.macros = recipe.macros && typeof recipe.macros === "string" ? JSON.parse(recipe.macros) : recipe.macros;
        recipe.tags = recipe.tags && typeof recipe.tags === "string" ? JSON.parse(recipe.tags) : recipe.tags;

        // If recipe was made private, remove it from other users' favorites
        if (wasPublic && isPublic !== true) {
            await pool.query(
                "DELETE FROM favorites WHERE food_id = $1 AND item_type = 'recipe' AND user_id != $2",
                [recipeId, userId]
            );
        }

        res.status(200).json({
            success: true,
            recipe
        });
    } catch (error: unknown) {
        console.error("Error updating recipe:", error);
        // Handle database constraint errors
        if (error && typeof error === "object" && "code" in error) {
            const dbError = error as { code: string; message?: string };
            if (dbError.code === "22001") {
                res.status(400).json({ error: "One or more fields exceed the maximum length allowed" });
                return;
            }
        }
        res.status(500).json({ error: "Internal server error" });
    }
}

// Delete recipe
export async function handleDeleteRecipe(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const { recipeId } = req.params;

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Verify recipe belongs to user and get image filename
        const verifyResult = await pool.query(
            "SELECT id, image_filename FROM recipes WHERE id = $1 AND user_id = $2",
            [recipeId, userId]
        );

        if (verifyResult.rows.length === 0) {
            res.status(404).json({ error: "Recipe not found" });
            return;
        }

        // Delete image from R2 if it exists (only if not used by other recipes)
        const imageFilename = verifyResult.rows[0].image_filename;
        if (imageFilename) {
            await deleteRecipeImageIfUnused(imageFilename, parseInt(recipeId, 10), pool);
        }

        // Delete all favorites for this recipe (for all users)
        await pool.query(
            "DELETE FROM favorites WHERE food_id = $1 AND item_type = 'recipe'",
            [recipeId]
        );

        // Delete the recipe
        await pool.query("DELETE FROM recipes WHERE id = $1 AND user_id = $2", [recipeId, userId]);

        res.status(200).json({
            success: true,
            message: "Recipe deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting recipe:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
