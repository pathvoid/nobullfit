import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Terms of Service page loader - sets page metadata for SEO
const termsOfServiceLoader = async (): Promise<LoaderData> => {
    return {
        title: "Terms of Service - NoBullFit",
        meta: generateSEOTags({
            title: "Terms of Service",
            description: "Read NoBullFit's terms of service. Understand the rules and guidelines for using our fitness and nutrition platform.",
            path: "/terms-of-service",
            keywords: [
                "terms of service",
                "user agreement",
                "terms and conditions",
                "NoBullFit terms"
            ]
        })
    };
};

export default termsOfServiceLoader;
