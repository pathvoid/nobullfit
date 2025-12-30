import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Settings page - requires authentication
const settingsLoader = async (args: LoaderFunctionArgs) => {
    // Ensure user is authenticated
    const dashboardData = await dashboardLoader(args);
    
    if (dashboardData instanceof Response) {
        return dashboardData;
    }

    return {
        title: "Settings - NoBullFit",
        meta: generateSEOTags({
            title: "Settings",
            description: "Manage your NoBullFit account settings. Update your profile, preferences, and notification options.",
            path: "/dashboard/settings",
            noIndex: true
        }),
        user: dashboardData.user
    };
};

export default settingsLoader;
