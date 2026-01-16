import type { Request, Response } from "express";
import { searchFoods } from "../utils/openFoodFactsService.js";

// Handler for food database search using OpenFoodFacts local database
export async function handleFoodDatabaseSearch(req: Request, res: Response): Promise<void> {
    try {
        const { query, offset, limit } = req.query;

        // Validate query parameter
        if (!query || typeof query !== "string") {
            res.status(400).json({ error: "Query parameter 'query' is required" });
            return;
        }

        // Parse pagination parameters
        const offsetNum = offset ? parseInt(offset as string, 10) : 0;
        const limitNum = limit ? parseInt(limit as string, 10) : 20;

        // Validate pagination
        if (isNaN(offsetNum) || offsetNum < 0) {
            res.status(400).json({ error: "Invalid offset parameter" });
            return;
        }
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            res.status(400).json({ error: "Invalid limit parameter (must be 1-100)" });
            return;
        }

        // Search using OpenFoodFacts service
        const data = await searchFoods(query, limitNum, offsetNum);
        res.json(data);
    } catch (error) {
        console.error("Error in food database search:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
