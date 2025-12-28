import { rand, sleep } from "@utils/utils";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Forgot password page loader - sets page metadata
// Runs on both server (SSR) and client (navigation)
const forgotPasswordLoader = async (): Promise<LoaderData> => {
    // Simulate async data fetching
    await sleep();
    return {
        title: "Forgot Password - NoBullFit",
        meta: [
            { name: "description", content: "Reset your NoBullFit account password" },
            { property: "og:title", content: "Forgot Password - NoBullFit" },
            { property: "og:description", content: "Reset your NoBullFit account password" }
        ]
    };
};

export default forgotPasswordLoader;
