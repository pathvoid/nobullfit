import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Pricing page loader - sets page metadata for SEO
const pricingLoader = async (): Promise<LoaderData> => {
    return {
        title: "Pricing - NoBullFit",
        meta: generateSEOTags({
            title: "Pricing",
            description: "View NoBullFit's pricing plans. Core features are free forever. Premium plans available for advanced features.",
            path: "/pricing",
            keywords: [
                "NoBullFit pricing",
                "fitness app pricing",
                "nutrition tracker pricing",
                "free fitness tracking",
                "premium fitness features"
            ]
        })
    };
};

export default pricingLoader;
