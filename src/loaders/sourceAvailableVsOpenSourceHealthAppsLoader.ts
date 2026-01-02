import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Source-available vs open source page loader - sets page metadata for SEO
const sourceAvailableVsOpenSourceHealthAppsLoader = async (): Promise<LoaderData> => {
    return {
        title: "Source-Available vs Open Source for Health Apps (Why It Matters) - NoBullFit",
        meta: generateSEOTags({
            title: "Source-Available vs Open Source for Health Apps (Why It Matters)",
            description: "Understand what source-available means for a health app and how it differs from open source. Learn why transparency matters for sensitive health data and how to review the code.",
            path: "/source-available-vs-open-source-for-health-apps",
            keywords: [
                "source-available health app",
                "source-available",
                "open source",
                "health apps",
                "privacy",
                "data handling",
                "transparent health app",
                "NoBullFit"
            ]
        })
    };
};

export default sourceAvailableVsOpenSourceHealthAppsLoader;
