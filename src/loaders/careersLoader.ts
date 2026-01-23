import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Careers page loader - sets page metadata for SEO
const careersLoader = async (): Promise<LoaderData> => {
    return {
        title: "Careers - NoBullFit",
        meta: generateSEOTags({
            title: "Careers",
            description: "Join the NoBullFit team. Explore career opportunities and help us build privacy-focused fitness and nutrition tracking tools.",
            path: "/careers",
            keywords: [
                "NoBullFit careers",
                "fitness tech jobs",
                "health technology careers",
                "privacy-focused company",
                "remote jobs"
            ]
        })
    };
};

export default careersLoader;
