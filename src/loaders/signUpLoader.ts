import { sleep } from "@utils/utils";
import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Sign up page loader - sets page metadata
// Runs on both server (SSR) and client (navigation)
const signUpLoader = async (): Promise<LoaderData> => {
    // Simulate async data fetching
    await sleep();
    return {
        title: "Sign Up - NoBullFit",
        meta: generateSEOTags({
            title: "Sign Up",
            description: "Create your free NoBullFit account and start your fitness journey today. Track nutrition, discover recipes, and monitor your progress.",
            path: "/sign-up",
            keywords: [
                "create account",
                "fitness app signup",
                "nutrition tracking",
                "free fitness account"
            ]
        })
    };
};

export default signUpLoader;
