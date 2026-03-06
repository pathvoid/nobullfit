import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for the admin users page - no auth, dev-only
const adminUsersLoader = async ({ request }: LoaderFunctionArgs) => {
    // Server-side: block in production via env check
    if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
        throw redirect("/");
    }

    return {
        title: "Users - Admin - NoBullFit",
        meta: generateSEOTags({
            title: "Admin Users",
            description: "NoBullFit admin user management.",
            path: "/admin/users",
            noIndex: true
        })
    };
};

export default adminUsersLoader;
