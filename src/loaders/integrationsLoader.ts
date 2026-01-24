import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Health & Fitness Integrations page - requires authentication
const integrationsLoader = async (args: LoaderFunctionArgs) => {
    // Ensure user is authenticated
    const dashboardData = await dashboardLoader(args);

    if (dashboardData instanceof Response) {
        return dashboardData;
    }

    return {
        title: "Health & Fitness Apps - NoBullFit",
        meta: generateSEOTags({
            title: "Health & Fitness Apps",
            description: "Connect your fitness devices and apps to automatically sync workouts, weight, and activity data with NoBullFit.",
            path: "/dashboard/integrations",
            noIndex: true
        }),
        user: dashboardData.user
    };
};

export default integrationsLoader;
