import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Contact page loader - sets page metadata for SEO
const contactLoader = async (): Promise<LoaderData> => {
    return {
        title: "Contact Us - NoBullFit",
        meta: generateSEOTags({
            title: "Contact Us",
            description: "Get in touch with the NoBullFit team. We're here to help with any questions about our nutrition tracking and fitness tools.",
            path: "/contact",
            keywords: [
                "contact NoBullFit",
                "fitness support",
                "customer service",
                "help"
            ]
        })
    };
};

export default contactLoader;
