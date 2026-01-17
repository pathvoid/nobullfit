import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Billing page - requires authentication
const billingLoader = async (args: LoaderFunctionArgs) => {
    // Ensure user is authenticated
    const dashboardData = await dashboardLoader(args);
    
    if (dashboardData instanceof Response) {
        return dashboardData;
    }

    return {
        title: "Billing - NoBullFit",
        meta: generateSEOTags({
            title: "Billing",
            description: "Manage your NoBullFit subscription and billing details. View your current plan, update payment methods, and access invoices.",
            path: "/dashboard/billing",
            noIndex: true
        }),
        user: dashboardData.user
    };
};

export default billingLoader;
