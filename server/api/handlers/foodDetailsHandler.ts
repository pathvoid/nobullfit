import type { Request, Response } from "express";

// Handler for fetching food details by food ID using Edamam API v2
export async function handleFoodDetails(req: Request, res: Response): Promise<void> {
    try {
        const { foodId } = req.params;

        if (!foodId) {
            res.status(400).json({ error: "Food ID parameter is required" });
            return;
        }

        const appId = process.env.EDAMAM_APP_ID;
        const appKey = process.env.EDAMAM_APP_KEY;

        if (!appId || !appKey) {
            res.status(500).json({ error: "Edamam API credentials not configured" });
            return;
        }

        const decodedFoodId = decodeURIComponent(foodId);
        
        // Search for the food - try searching by the foodId (which might be a URI or label)
        // First, try to find it by searching for a common food name pattern
        // If foodId looks like a URI, extract a search term from it
        let searchTerm = decodedFoodId;
        
        // If it's a URI, try to extract a meaningful search term
        if (decodedFoodId.includes("#")) {
            // Extract the part after the hash (e.g., "Food_12345" from URI)
            const uriParts = decodedFoodId.split("#");
            if (uriParts.length > 1) {
                const foodPart = uriParts[uriParts.length - 1];
                // Try to extract a readable name (remove "Food_" prefix if present)
                searchTerm = foodPart.replace(/^Food_/, "").replace(/_/g, " ");
            }
        }
        
        const baseUrl = "https://api.edamam.com/api/food-database/v2/parser";
        const params = new URLSearchParams({
            app_id: appId,
            app_key: appKey,
            ingr: searchTerm,
            categoryLabel: "food"
        });
        const apiUrl = `${baseUrl}?${params.toString()}`;

        // Make request to Edamam API
        const response = await fetch(apiUrl, {
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            res.status(response.status).json({ 
                error: "Failed to fetch food details from Edamam API",
                details: errorText 
            });
            return;
        }

        const data = await response.json();
        
        // Find the exact food match by foodId (check both foodId and uri)
        const foodMatch = data.hints?.find((hint: { food: { foodId: string; uri?: string } }) => 
            hint.food.foodId === decodedFoodId || hint.food.uri === decodedFoodId
        ) || data.parsed?.[0];

        if (!foodMatch) {
            res.status(404).json({ error: "Food not found" });
            return;
        }

        // If foodMatch is a hint, merge measures into food object
        // If foodMatch is parsed, include the single measure if available
        if (foodMatch.food && foodMatch.measures) {
            // It's a hint - merge measures into food
            const result = {
                food: {
                    ...foodMatch.food,
                    measures: foodMatch.measures
                }
            };
            res.json(result);
        } else if (foodMatch.food && foodMatch.measure) {
            // It's parsed with a single measure - convert to array
            const result = {
                food: {
                    ...foodMatch.food,
                    measures: [foodMatch.measure]
                }
            };
            res.json(result);
        } else if (foodMatch.food) {
            // It's parsed without a measure - check if food has measures
            const result = {
                food: foodMatch.food.measures ? foodMatch.food : {
                    ...foodMatch.food,
                    measures: []
                }
            };
            res.json(result);
        } else {
            // Fallback - return as is
            res.json(foodMatch);
        }
    } catch (error) {
        console.error("Error in food details handler:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
