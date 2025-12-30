import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Refund Policy page loader - sets page metadata for SEO
const refundPolicyLoader = async (): Promise<LoaderData> => {
    return {
        title: "Refund Policy - NoBullFit",
        meta: generateSEOTags({
            title: "Refund Policy",
            description: "Read NoBullFit's refund policy. Learn about our refund process and eligibility requirements.",
            path: "/refund-policy",
            keywords: [
                "refund policy",
                "money back",
                "cancellation policy",
                "NoBullFit refund"
            ]
        })
    };
};

export default refundPolicyLoader;
