import { sleep } from "@utils/utils";
import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Sign in page loader - sets page metadata
// Runs on both server (SSR) and client (navigation)
const signInLoader = async (): Promise<LoaderData> => {
    // Simulate async data fetching
    await sleep();
    return {
        title: "Sign In - NoBullFit",
        meta: generateSEOTags({
            title: "Sign In",
            description: "Sign in to your NoBullFit account to access your personalized nutrition tracking, recipes, and fitness progress.",
            path: "/sign-in",
            noIndex: true
        })
    };
};

export default signInLoader;
