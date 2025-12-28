import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// About page loader - sets page metadata for SEO
const aboutLoader = async (): Promise<LoaderData> => {
    return {
        title: "About Us - NoBullFit",
        meta: [
            { name: "description", content: "Learn more about NoBullFit and our mission" },
            { property: "og:title", content: "About Us - NoBullFit" },
            { property: "og:description", content: "Learn more about NoBullFit and our mission" }
        ]
    };
};

export default aboutLoader;
