import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";

// Loader for Food Tracking page - requires authentication
const foodTrackingLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    
    // Get date from URL search params if provided
    const url = new URL(args.request.url);
    const dateParam = url.searchParams.get("date");
    const timezoneParam = url.searchParams.get("timezone");
    
    let foods = [];
    
    // If date is provided, fetch foods for that date
    if (dateParam && timezoneParam) {
        try {
            const response = await fetch(`${url.origin}/api/food-tracking?date=${dateParam}&timezone=${timezoneParam}`, {
                credentials: "include"
            });
            
            if (response.ok) {
                const result = await response.json();
                foods = result.foods || [];
            }
        } catch (error) {
            console.error("Error loading food tracking data:", error);
        }
    }
    
    return {
        ...data,
        title: "Food Tracking - NoBullFit",
        meta: [
            { name: "description", content: "Track your daily food intake and nutrition" }
        ],
        initialFoods: foods,
        initialDate: dateParam || null,
        initialTimezone: timezoneParam || null
    };
};

export default foodTrackingLoader;
