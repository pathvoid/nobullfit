import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Privacy Policy page loader - sets page metadata for SEO
const privacyPolicyLoader = async (): Promise<LoaderData> => {
    return {
        title: "Privacy Policy - NoBullFit",
        meta: [
            { name: "description", content: "Read NoBullFit's privacy policy" },
            { property: "og:title", content: "Privacy Policy - NoBullFit" },
            { property: "og:description", content: "Read NoBullFit's privacy policy" }
        ]
    };
};

export default privacyPolicyLoader;
