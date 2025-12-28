import { rand, sleep } from "@utils/utils";
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
        meta: [
            { name: "description", content: "Create your NoBullFit account" },
            { property: "og:title", content: "Sign Up - NoBullFit" },
            { property: "og:description", content: "Create your NoBullFit account" }
        ]
    };
};

export default signUpLoader;
