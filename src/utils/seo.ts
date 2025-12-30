import type { MetaTag } from "../types/helmet";

// SEO configuration constants
const SITE_NAME = "NoBullFit";
const SITE_URL = "https://nobull.fit";
const DEFAULT_OG_IMAGE = "https://cdn.nobull.fit/nbf-og.jpg";
const TWITTER_HANDLE = "@nobullfitx";
const DEFAULT_DESCRIPTION = "Transform your fitness journey with NoBullFit - Your all-in-one platform for nutrition tracking, recipe management, and progress monitoring.";

// Options for generating SEO meta tags
export interface SEOOptions {
    title: string;
    description: string;
    path?: string;
    ogImage?: string;
    ogType?: "website" | "article" | "profile";
    noIndex?: boolean;
    keywords?: string[];
    author?: string;
}

// Generate complete SEO meta tags for a page
export function generateSEOTags(options: SEOOptions): MetaTag[] {
    const {
        title,
        description,
        path = "",
        ogImage = DEFAULT_OG_IMAGE,
        ogType = "website",
        noIndex = false,
        keywords = [],
        author = SITE_NAME
    } = options;

    const fullTitle = title.includes(SITE_NAME) ? title : `${title} - ${SITE_NAME}`;
    const fullUrl = `${SITE_URL}${path}`;

    const tags: MetaTag[] = [
        // Basic SEO meta tags
        { name: "description", content: description },
        { name: "author", content: author },
        
        // Open Graph (Facebook, LinkedIn, etc.)
        { property: "og:title", content: fullTitle },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { property: "og:image:alt", content: `${SITE_NAME} - ${title}` },
        { property: "og:url", content: fullUrl },
        { property: "og:type", content: ogType },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:locale", content: "en_US" },
        
        // Twitter/X Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: TWITTER_HANDLE },
        { name: "twitter:title", content: fullTitle },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
        { name: "twitter:image:alt", content: `${SITE_NAME} - ${title}` }
    ];

    // Add keywords if provided
    if (keywords.length > 0) {
        tags.push({ name: "keywords", content: keywords.join(", ") });
    }

    // Add robots directive
    if (noIndex) {
        tags.push({ name: "robots", content: "noindex, nofollow" });
    } else {
        tags.push({ name: "robots", content: "index, follow" });
    }

    return tags;
}

// Generate default/fallback SEO tags
export function getDefaultSEOTags(): MetaTag[] {
    return generateSEOTags({
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        path: "/",
        keywords: [
            "fitness",
            "nutrition",
            "calories",
            "recipe",
            "meal planning",
            "food tracking",
            "TDEE calculator",
            "macros",
            "health"
        ]
    });
}

// Export constants for use in other parts of the application
export { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE, DEFAULT_DESCRIPTION };
