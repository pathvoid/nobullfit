import { rand, sleep } from "@utils/utils";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    data: string;
    title: string;
    meta: MetaTag[];
}

// Home page loader - fetches data and sets page metadata
// Runs on both server (SSR) and client (navigation)
const homeLoader = async (): Promise<LoaderData> => {
    // Simulate async data fetching
    await sleep();
    return {
        data: `Home loader - random value ${rand()}`,
        title: "Home - NoBullFit",
        meta: [
            { name: "description", content: "Transform your fitness journey with NoBullFit" },
            { property: "og:title", content: "Home - NoBullFit" },
            { property: "og:description", content: "Transform your fitness journey with NoBullFit" }
        ]
    };
};

export default homeLoader;