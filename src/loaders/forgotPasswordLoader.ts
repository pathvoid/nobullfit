import { sleep } from "@utils/utils";
import { generateSEOTags } from "@utils/seo";
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
        meta: generateSEOTags({
            title: "Forgot Password",
            description: "Reset your NoBullFit account password. Enter your email to receive password reset instructions.",
            path: "/forgot-password",
            noIndex: true
        })
    };
};

export default forgotPasswordLoader;
