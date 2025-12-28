import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Refund Policy page loader - sets page metadata for SEO
const refundPolicyLoader = async (): Promise<LoaderData> => {
    return {
        title: "Refund Policy - NoBullFit",
        meta: [
            { name: "description", content: "Read NoBullFit's refund policy and terms" },
            { property: "og:title", content: "Refund Policy - NoBullFit" },
            { property: "og:description", content: "Read NoBullFit's refund policy and terms" }
        ]
    };
};

export default refundPolicyLoader;
