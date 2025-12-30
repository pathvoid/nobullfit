import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Loader for Recipe Database page
const recipeDatabaseLoader = async (): Promise<LoaderData> => {
    return {
        title: "Recipe Database - NoBullFit",
        meta: generateSEOTags({
            title: "Recipe Database",
            description: "Browse and search recipes created by the NoBullFit community. Find healthy, nutritious recipes with detailed nutritional information.",
            path: "/recipes",
            keywords: [
                "recipes",
                "healthy recipes",
                "nutritious meals",
                "recipe database",
                "meal ideas",
                "cooking",
                "nutrition"
            ]
        })
    };
};

export default recipeDatabaseLoader;
