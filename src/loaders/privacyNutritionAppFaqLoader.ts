import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Privacy nutrition app FAQ loader - sets page metadata for SEO
const privacyNutritionAppFaqLoader = async (): Promise<LoaderData> => {
    return {
        title: "Privacy FAQ for Nutrition Apps (What You Should Expect) - NoBullFit",
        meta: generateSEOTags({
            title: "Privacy FAQ for Nutrition Apps (What You Should Expect)",
            description: "Privacy nutrition app FAQ: Learn what data NoBullFit collects, how it's used, export and deletion options, security practices, and transparency commitments.",
            path: "/privacy-nutrition-app-faq",
            keywords: [
                "privacy nutrition app FAQ",
                "privacy nutrition app",
                "nutrition tracker privacy",
                "data export nutrition app",
                "data deletion nutrition app",
                "nutrition app security",
                "no ads nutrition tracker",
                "no tracking nutrition app"
            ]
        })
    };
};

export default privacyNutritionAppFaqLoader;
