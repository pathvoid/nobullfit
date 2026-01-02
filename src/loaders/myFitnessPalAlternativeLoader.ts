import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// MyFitnessPal alternative landing page loader - sets page metadata for SEO
const myFitnessPalAlternativeLoader = async (): Promise<LoaderData> => {
    return {
        title: "MyFitnessPal Alternative Without Ads or Data Selling - NoBullFit",
        meta: generateSEOTags({
            title: "MyFitnessPal Alternative Without Ads or Data Selling",
            description: "Looking for a MyFitnessPal alternative privacy-focused option? NoBullFit is an ad-free nutrition tracker with no data selling. Compare features and see why privacy-first tracking matters.",
            path: "/myfitnesspal-alternative-without-ads-or-data-selling",
            keywords: [
                "myfitnesspal alternative privacy",
                "MyFitnessPal alternative",
                "privacy-first nutrition tracker",
                "ad-free food tracker",
                "no data selling",
                "nutrition tracker",
                "food diary",
                "macros",
                "no ads",
                "no tracking"
            ]
        })
    };
};

export default myFitnessPalAlternativeLoader;
