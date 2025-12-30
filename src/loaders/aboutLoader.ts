import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// About page loader - sets page metadata for SEO
const aboutLoader = async (): Promise<LoaderData> => {
    return {
        title: "About Us - NoBullFit",
        meta: generateSEOTags({
            title: "About Us",
            description: "Learn about NoBullFit's mission to help you achieve your fitness goals with honest, science-backed nutrition and fitness tracking tools.",
            path: "/about",
            keywords: [
                "about NoBullFit",
                "fitness platform",
                "nutrition tracking",
                "fitness goals",
                "health technology"
            ]
        })
    };
};

export default aboutLoader;
