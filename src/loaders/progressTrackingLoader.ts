import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Progress Tracking page - requires authentication
const progressTrackingLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    
    // Get date from URL search params if provided
    const url = new URL(args.request.url);
    const dateParam = url.searchParams.get("date");
    const timezoneParam = url.searchParams.get("timezone");
    
    let activities = [];
    
    // If date is provided, fetch activities for that date
    if (dateParam && timezoneParam) {
        try {
            const response = await fetch(`${url.origin}/api/progress-tracking?date=${dateParam}&timezone=${timezoneParam}`, {
                credentials: "include"
            });
            
            if (response.ok) {
                const result = await response.json();
                activities = result.activities || [];
            }
        } catch (error) {
            console.error("Error loading progress tracking data:", error);
        }
    }
    
    return {
        ...data,
        title: "Progress Tracking - NoBullFit",
        meta: generateSEOTags({
            title: "Progress Tracking",
            description: "Track your health and fitness progress over time. Log activities, monitor trends, and celebrate your achievements.",
            path: "/dashboard/progress-tracking",
            noIndex: true
        }),
        initialActivities: activities,
        initialDate: dateParam || null,
        initialTimezone: timezoneParam || null
    };
};

export default progressTrackingLoader;
