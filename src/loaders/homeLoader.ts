import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Home page loader - fetches data and sets page metadata
// Runs on both server (SSR) and client (navigation)
const homeLoader = async (): Promise<LoaderData> => {
    return {
        title: "NoBullFit - Track nutrition without ads or data selling",
        meta: generateSEOTags({
            title: "Track nutrition, recipes, and progress - without ads or data selling",
            description: "NoBullFit is a privacy-first health tracking platform for food logging, recipes, grocery lists, weight, and activity. Your data isn’t the product.",
            path: "/",
            keywords: [
                "privacy-first",
                "fitness",
                "nutrition",
                "calories",
                "recipe",
                "meal planning",
                "food tracking",
                "food diary",
                "TDEE calculator",
                "macros",
                "health",
                "weight loss",
                "muscle building",
                "no ads",
                "no tracking"
            ]
        })
    };
};

export default homeLoader;
