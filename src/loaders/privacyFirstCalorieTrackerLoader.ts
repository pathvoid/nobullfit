import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Privacy-first calorie tracker page loader - sets page metadata for SEO
const privacyFirstCalorieTrackerLoader = async (): Promise<LoaderData> => {
    return {
        title: "Privacy-First Calorie Tracker App (No Ads, No Tracking) - NoBullFit",
        meta: generateSEOTags({
            title: "Privacy-First Calorie Tracker App (No Ads, No Tracking)",
            description: "Privacy-first calorie tracker with no ads, no tracking, and full data control. Learn what privacy-first means, what data is collected, and how export and deletion work.",
            path: "/privacy-first-calorie-tracker",
            keywords: [
                "privacy-first calorie tracker",
                "calorie tracker privacy",
                "no ads calorie tracker",
                "no tracking nutrition app",
                "privacy calorie tracker",
                "nutrition tracker privacy",
                "data control calorie tracker"
            ]
        })
    };
};

export default privacyFirstCalorieTrackerLoader;
