import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Track macros with recipes landing page loader - sets page metadata for SEO
const trackMacrosWithRecipesLoader = async (): Promise<LoaderData> => {
    return {
        title: "How to Track Macros When You Cook (Recipes + Food Diary) - NoBullFit",
        meta: generateSEOTags({
            title: "How to Track Macros When You Cook (Recipes + Food Diary)",
            description: "Learn how to track macros with recipes when you cook. Simple workflow: create recipe → log serving → repeat. Tips for consistency and common mistakes to avoid.",
            path: "/track-macros-with-recipes",
            keywords: [
                "track macros with recipes",
                "recipe nutrition tracking",
                "macro tracking for cooking",
                "recipe macros",
                "nutrition tracker recipes",
                "meal prep macros",
                "food diary recipes"
            ]
        })
    };
};

export default trackMacrosWithRecipesLoader;
