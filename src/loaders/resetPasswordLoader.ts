import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Loader for Reset Password page
const resetPasswordLoader = async (): Promise<LoaderData> => {
    return {
        title: "Reset Password - NoBullFit",
        meta: generateSEOTags({
            title: "Reset Password",
            description: "Create a new password for your NoBullFit account.",
            path: "/reset-password",
            noIndex: true
        })
    };
};

export default resetPasswordLoader;
