import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for the admin panel - no auth, dev-only
const adminLoader = async ({ request }: LoaderFunctionArgs) => {
    // Server-side: block in production via env check
    if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
        throw redirect("/");
    }

    return {
        title: "Admin - NoBullFit",
        meta: generateSEOTags({
            title: "Admin Panel",
            description: "NoBullFit admin panel.",
            path: "/admin",
            noIndex: true
        })
    };
};

export default adminLoader;
