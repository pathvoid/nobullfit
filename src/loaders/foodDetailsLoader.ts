import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Food Details page - requires authentication
const foodDetailsLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    const { foodId } = args.params;

    if (!foodId) {
        return {
            ...data,
            title: "Food Details - NoBullFit",
            meta: generateSEOTags({
                title: "Food Details",
                description: "View detailed nutritional information for this food item.",
                path: "/dashboard/food-database",
                noIndex: true
            }),
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
                meta: generateSEOTags({
                    title: "Food Details",
                    description: "View detailed nutritional information.",
                    path: `/dashboard/food-database/${foodId}`,
                    noIndex: true
                }),
                error: "Failed to load food details"
            };
        }

        const foodData = await response.json();
        const foodLabel = foodData.food?.label || "Food Details";

        return {
            ...data,
            title: `${foodLabel} - NoBullFit`,
            meta: generateSEOTags({
                title: foodLabel,
                description: `Nutritional information for ${foodLabel}. View calories, macros, vitamins, and minerals.`,
                path: `/dashboard/food-database/${foodId}`,
                noIndex: true
            }),
            foodData: {
                food: foodData.food || foodData
            }
        };
    } catch (error) {
        console.error("Error loading food details:", error);
        return {
            ...data,
            title: "Food Details - NoBullFit",
            meta: generateSEOTags({
                title: "Food Details",
                description: "View detailed nutritional information.",
                path: `/dashboard/food-database/${foodId}`,
                noIndex: true
            }),
            error: "Failed to load food details"
        };
    }
};

export default foodDetailsLoader;
