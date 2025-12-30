import { rand, sleep } from "@utils/utils";
import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    data: string;
    title: string;
    meta: MetaTag[];
}

// Home page loader - fetches data and sets page metadata
// Runs on both server (SSR) and client (navigation)
const homeLoader = async (): Promise<LoaderData> => {
    // Simulate async data fetching
    await sleep();
    return {
        data: `Home loader - random value ${rand()}`,
        title: "NoBullFit - Transform Your Fitness Journey",
        meta: generateSEOTags({
            title: "NoBullFit - Transform Your Fitness Journey",
            description: "Transform your fitness journey with NoBullFit - Your all-in-one platform for nutrition tracking, recipe management, and progress monitoring.",
            path: "/",
            keywords: [
                "fitness",
                "nutrition",
                "calories",
                "recipe",
                "meal planning",
                "food tracking",
                "TDEE calculator",
                "macros",
                "health",
                "weight loss",
                "muscle building"
            ]
        })
    };
};

export default homeLoader;
