import { rand, sleep } from "@utils/utils";
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
        meta: [
            { name: "description", content: "Sign in to your NoBullFit account" },
            { property: "og:title", content: "Sign In - NoBullFit" },
            { property: "og:description", content: "Sign in to your NoBullFit account" }
        ]
    };
};

export default signInLoader;
