import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for the admin logs page - no auth, dev-only
const adminLogsLoader = async ({ request }: LoaderFunctionArgs) => {
    // Server-side: block in production via env check
    if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
        throw redirect("/");
    }

    return {
        title: "Logs - Admin - NoBullFit",
        meta: generateSEOTags({
            title: "Admin Logs",
            description: "NoBullFit admin system logs.",
            path: "/admin/logs",
            noIndex: true
        })
    };
};

export default adminLogsLoader;
