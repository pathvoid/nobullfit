import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Privacy Policy page loader - sets page metadata for SEO
const privacyPolicyLoader = async (): Promise<LoaderData> => {
    return {
        title: "Privacy Policy - NoBullFit",
        meta: generateSEOTags({
            title: "Privacy Policy",
            description: "Read NoBullFit's privacy policy. Learn how we collect, use, and protect your personal information.",
            path: "/privacy-policy",
            keywords: [
                "privacy policy",
                "data protection",
                "user privacy",
                "NoBullFit privacy"
            ]
        })
    };
};

export default privacyPolicyLoader;
