import { describe, it, expect } from "vitest";
import {
    generateSEOTags,
    getDefaultSEOTags,
    SITE_NAME,
    SITE_URL,
    DEFAULT_OG_IMAGE,
    DEFAULT_DESCRIPTION
} from "./seo";
import type { SEOOptions } from "./seo";

describe("seo", () => {
    describe("constants", () => {
        it("should have correct SITE_NAME", () => {
            expect(SITE_NAME).toBe("NoBullFit");
        });

        it("should have correct SITE_URL", () => {
            expect(SITE_URL).toBe("https://nobull.fit");
        });

        it("should have valid DEFAULT_OG_IMAGE URL", () => {
            expect(DEFAULT_OG_IMAGE).toMatch(/^https:\/\//);
            expect(DEFAULT_OG_IMAGE).toContain("nobull.fit");
        });

        it("should have a meaningful DEFAULT_DESCRIPTION", () => {
            expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(50);
            expect(DEFAULT_DESCRIPTION.toLowerCase()).toContain("fitness");
        });
    });

    describe("generateSEOTags", () => {
        const basicOptions: SEOOptions = {
            title: "Test Page",
            description: "This is a test description"
        };

        it("should generate basic meta tags", () => {
            const tags = generateSEOTags(basicOptions);
            expect(Array.isArray(tags)).toBe(true);
            expect(tags.length).toBeGreaterThan(0);
        });

        it("should include description meta tag", () => {
            const tags = generateSEOTags(basicOptions);
            const descTag = tags.find(t => t.name === "description");
            expect(descTag).toBeDefined();
            expect(descTag?.content).toBe("This is a test description");
        });

        it("should include author meta tag", () => {
            const tags = generateSEOTags(basicOptions);
            const authorTag = tags.find(t => t.name === "author");
            expect(authorTag).toBeDefined();
            expect(authorTag?.content).toBe(SITE_NAME);
        });

        it("should include Open Graph tags", () => {
            const tags = generateSEOTags(basicOptions);

            const ogTitle = tags.find(t => t.property === "og:title");
            expect(ogTitle).toBeDefined();
            expect(ogTitle?.content).toContain("Test Page");
            expect(ogTitle?.content).toContain(SITE_NAME);

            const ogDescription = tags.find(t => t.property === "og:description");
            expect(ogDescription).toBeDefined();
            expect(ogDescription?.content).toBe("This is a test description");

            const ogImage = tags.find(t => t.property === "og:image");
            expect(ogImage).toBeDefined();
            expect(ogImage?.content).toBe(DEFAULT_OG_IMAGE);

            const ogType = tags.find(t => t.property === "og:type");
            expect(ogType).toBeDefined();
            expect(ogType?.content).toBe("website");

            const ogSiteName = tags.find(t => t.property === "og:site_name");
            expect(ogSiteName).toBeDefined();
            expect(ogSiteName?.content).toBe(SITE_NAME);
        });

        it("should include Twitter card tags", () => {
            const tags = generateSEOTags(basicOptions);

            const twitterCard = tags.find(t => t.name === "twitter:card");
            expect(twitterCard).toBeDefined();
            expect(twitterCard?.content).toBe("summary_large_image");

            const twitterSite = tags.find(t => t.name === "twitter:site");
            expect(twitterSite).toBeDefined();
            expect(twitterSite?.content).toMatch(/^@/);

            const twitterTitle = tags.find(t => t.name === "twitter:title");
            expect(twitterTitle).toBeDefined();

            const twitterDescription = tags.find(t => t.name === "twitter:description");
            expect(twitterDescription).toBeDefined();

            const twitterImage = tags.find(t => t.name === "twitter:image");
            expect(twitterImage).toBeDefined();
        });

        it("should append SITE_NAME to title if not already included", () => {
            const tags = generateSEOTags(basicOptions);
            const ogTitle = tags.find(t => t.property === "og:title");
            expect(ogTitle?.content).toBe("Test Page - NoBullFit");
        });

        it("should not duplicate SITE_NAME if already in title", () => {
            const options: SEOOptions = {
                title: "NoBullFit - Home",
                description: "Test description"
            };
            const tags = generateSEOTags(options);
            const ogTitle = tags.find(t => t.property === "og:title");
            expect(ogTitle?.content).toBe("NoBullFit - Home");
        });

        it("should construct full URL from path", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                path: "/dashboard"
            };
            const tags = generateSEOTags(options);
            const ogUrl = tags.find(t => t.property === "og:url");
            expect(ogUrl?.content).toBe("https://nobull.fit/dashboard");
        });

        it("should use custom OG image when provided", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                ogImage: "https://example.com/custom.jpg"
            };
            const tags = generateSEOTags(options);
            const ogImage = tags.find(t => t.property === "og:image");
            expect(ogImage?.content).toBe("https://example.com/custom.jpg");
        });

        it("should use custom OG type when provided", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                ogType: "article"
            };
            const tags = generateSEOTags(options);
            const ogType = tags.find(t => t.property === "og:type");
            expect(ogType?.content).toBe("article");
        });

        it("should add keywords when provided", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                keywords: ["fitness", "nutrition", "health"]
            };
            const tags = generateSEOTags(options);
            const keywordsTag = tags.find(t => t.name === "keywords");
            expect(keywordsTag).toBeDefined();
            expect(keywordsTag?.content).toBe("fitness, nutrition, health");
        });

        it("should not add keywords tag when keywords array is empty", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                keywords: []
            };
            const tags = generateSEOTags(options);
            const keywordsTag = tags.find(t => t.name === "keywords");
            expect(keywordsTag).toBeUndefined();
        });

        it("should add noindex robots tag when noIndex is true", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                noIndex: true
            };
            const tags = generateSEOTags(options);
            const robotsTag = tags.find(t => t.name === "robots");
            expect(robotsTag).toBeDefined();
            expect(robotsTag?.content).toBe("noindex, nofollow");
        });

        it("should add index robots tag when noIndex is false or undefined", () => {
            const tags = generateSEOTags(basicOptions);
            const robotsTag = tags.find(t => t.name === "robots");
            expect(robotsTag).toBeDefined();
            expect(robotsTag?.content).toBe("index, follow");
        });

        it("should use custom author when provided", () => {
            const options: SEOOptions = {
                title: "Test",
                description: "Test",
                author: "John Doe"
            };
            const tags = generateSEOTags(options);
            const authorTag = tags.find(t => t.name === "author");
            expect(authorTag?.content).toBe("John Doe");
        });
    });

    describe("getDefaultSEOTags", () => {
        it("should return an array of meta tags", () => {
            const tags = getDefaultSEOTags();
            expect(Array.isArray(tags)).toBe(true);
            expect(tags.length).toBeGreaterThan(0);
        });

        it("should use SITE_NAME as title", () => {
            const tags = getDefaultSEOTags();
            const ogTitle = tags.find(t => t.property === "og:title");
            expect(ogTitle?.content).toBe(SITE_NAME);
        });

        it("should use DEFAULT_DESCRIPTION", () => {
            const tags = getDefaultSEOTags();
            const descTag = tags.find(t => t.name === "description");
            expect(descTag?.content).toBe(DEFAULT_DESCRIPTION);
        });

        it("should include default keywords", () => {
            const tags = getDefaultSEOTags();
            const keywordsTag = tags.find(t => t.name === "keywords");
            expect(keywordsTag).toBeDefined();
            expect(keywordsTag?.content).toContain("fitness");
            expect(keywordsTag?.content).toContain("nutrition");
        });

        it("should use root path", () => {
            const tags = getDefaultSEOTags();
            const ogUrl = tags.find(t => t.property === "og:url");
            expect(ogUrl?.content).toBe("https://nobull.fit/");
        });

        it("should allow indexing", () => {
            const tags = getDefaultSEOTags();
            const robotsTag = tags.find(t => t.name === "robots");
            expect(robotsTag?.content).toBe("index, follow");
        });
    });
});
