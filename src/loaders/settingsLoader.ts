import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";

// Loader for Settings page - requires authentication
const settingsLoader = async (args: LoaderFunctionArgs) => {
    // Ensure user is authenticated
    const dashboardData = await dashboardLoader(args);
    
    if (dashboardData instanceof Response) {
        return dashboardData;
    }

    return {
        title: "Settings - NoBullFit",
        meta: [
            { name: "description", content: "Manage your account settings" }
        ],
        user: dashboardData.user
    };
};

export default settingsLoader;
