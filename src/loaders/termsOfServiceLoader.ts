import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Terms of Service page loader - sets page metadata for SEO
const termsOfServiceLoader = async (): Promise<LoaderData> => {
    return {
        title: "Terms of Service - NoBullFit",
        meta: [
            { name: "description", content: "Read NoBullFit's terms of service" },
            { property: "og:title", content: "Terms of Service - NoBullFit" },
            { property: "og:description", content: "Read NoBullFit's terms of service" }
        ]
    };
};

export default termsOfServiceLoader;
