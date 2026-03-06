import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for the admin emails page - no auth, dev-only
const adminEmailsLoader = async ({ request }: LoaderFunctionArgs) => {
    // Server-side: block in production via env check
    if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
        throw redirect("/");
    }

    return {
        title: "Emails - Admin - NoBullFit",
        meta: generateSEOTags({
            title: "Admin Emails",
            description: "NoBullFit admin email management.",
            path: "/admin/emails",
            noIndex: true
        })
    };
};

export default adminEmailsLoader;
