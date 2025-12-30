import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Loader for Confirm Email Change page
const confirmEmailChangeLoader = async (): Promise<LoaderData> => {
    return {
        title: "Confirm Email Change - NoBullFit",
        meta: generateSEOTags({
            title: "Confirm Email Change",
            description: "Confirm your email address change for your NoBullFit account.",
            path: "/confirm-email-change",
            noIndex: true
        })
    };
};

export default confirmEmailChangeLoader;
