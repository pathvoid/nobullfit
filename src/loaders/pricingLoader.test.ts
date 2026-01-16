import { describe, it, expect } from "vitest";
import pricingLoader from "./pricingLoader";

describe("pricingLoader", () => {
    it("should return correct title and meta tags", async () => {
        const result = await pricingLoader();
        
        expect(result).toHaveProperty("title");
        expect(result.title).toBe("Pricing - NoBullFit");
        
        expect(result).toHaveProperty("meta");
        expect(Array.isArray(result.meta)).toBe(true);
        expect(result.meta.length).toBeGreaterThan(0);
        
        // Check for expected meta tags
        const metaTags = result.meta as Array<{ name?: string; property?: string; content?: string }>;
        const hasDescription = metaTags.some(
            tag => (tag.name === "description" || tag.property === "og:description") && tag.content
        );
        expect(hasDescription).toBe(true);
    });
});
