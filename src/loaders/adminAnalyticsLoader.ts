import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for the admin analytics page - no auth, dev-only
const adminAnalyticsLoader = async ({ request }: LoaderFunctionArgs) => {
    // Server-side: block in production via env check
    if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
        throw redirect("/");
    }

    return {
        title: "Analytics - Admin - NoBullFit",
        meta: generateSEOTags({
            title: "Admin Analytics",
            description: "NoBullFit platform analytics and metrics.",
            path: "/admin/analytics",
            noIndex: true
        })
    };
};

export default adminAnalyticsLoader;
