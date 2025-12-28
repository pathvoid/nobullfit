import type { Request, Response } from "express";

// Handler for food database search using Edamam API v2
export async function handleFoodDatabaseSearch(req: Request, res: Response): Promise<void> {
    try {
        const { query, nextUrl } = req.query;

        // Validate query parameter
        if (!query && !nextUrl) {
            res.status(400).json({ error: "Query parameter 'query' or 'nextUrl' is required" });
            return;
        }

        const appId = process.env.EDAMAM_APP_ID;
        const appKey = process.env.EDAMAM_APP_KEY;

        if (!appId || !appKey) {
            res.status(500).json({ error: "Edamam API credentials not configured" });
            return;
        }

        let apiUrl: string;

        if (nextUrl && typeof nextUrl === "string") {
            // Use the next URL from pagination
            apiUrl = nextUrl;
        } else {
            // Build the initial search URL
            const baseUrl = "https://api.edamam.com/api/food-database/v2/parser";
            const params = new URLSearchParams({
                app_id: appId,
                app_key: appKey,
                ingr: query as string,
                categoryLabel: "food"
            });
            apiUrl = `${baseUrl}?${params.toString()}`;
        }

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
                error: "Failed to fetch from Edamam API",
                details: errorText 
            });
            return;
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error in food database search:", error);
        res.status(500).json({ 
            error: "Internal server error",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
}