import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";

// Loader for Food Details page - requires authentication
const foodDetailsLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    const { foodId } = args.params;

    if (!foodId) {
        return {
            ...data,
            title: "Food Details - NoBullFit",
            meta: [
                { name: "description", content: "Food details" }
            ],
            error: "Food ID is required"
        };
    }

    try {
        // Get the request URL to construct the API URL correctly for both server and client
        const url = new URL(args.request.url);
        
        // Fetch food details from API
        const response = await fetch(`${url.origin}/api/food-database/details/${encodeURIComponent(foodId)}`, {
            credentials: "include"
        });
        
        if (!response.ok) {
            return {
                ...data,
                title: "Food Details - NoBullFit",
                meta: [
                    { name: "description", content: "Food details" }
                ],
                error: "Failed to load food details"
            };
        }

        const foodData = await response.json();

        return {
            ...data,
            title: `${foodData.food?.label || "Food Details"} - NoBullFit`,
            meta: [
                { name: "description", content: `Nutritional information for ${foodData.food?.label || "food"}` }
            ],
            foodData: {
                food: foodData.food || foodData
            }
        };
    } catch (error) {
        console.error("Error loading food details:", error);
        return {
            ...data,
            title: "Food Details - NoBullFit",
            meta: [
                { name: "description", content: "Food details" }
            ],
            error: "Failed to load food details"
        };
    }
};

export default foodDetailsLoader;
