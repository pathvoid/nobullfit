import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Contact page loader - sets page metadata for SEO
const contactLoader = async (): Promise<LoaderData> => {
    return {
        title: "Contact Us - NoBullFit",
        meta: [
            { name: "description", content: "Get in touch with NoBullFit" },
            { property: "og:title", content: "Contact Us - NoBullFit" },
            { property: "og:description", content: "Get in touch with NoBullFit" }
        ]
    };
};

export default contactLoader;
