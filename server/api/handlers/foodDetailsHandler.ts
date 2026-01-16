import type { Request, Response } from "express";
import { getFoodById } from "../utils/openFoodFactsService.js";

// Handler for fetching food details by food ID (barcode) using OpenFoodFacts local database
export async function handleFoodDetails(req: Request, res: Response): Promise<void> {
    try {
        const { foodId } = req.params;

        if (!foodId || typeof foodId !== "string") {
            res.status(400).json({ error: "Food ID parameter is required" });
            return;
        }

        const decodedFoodId = decodeURIComponent(foodId);
        
        // Get food details from OpenFoodFacts database
        const food = await getFoodById(decodedFoodId);

        if (!food) {
            res.status(404).json({ error: "Food not found" });
            return;
        }

        // Return in compatible format
        res.json({ food });
    } catch (error) {
        console.error("Error in food details handler:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
