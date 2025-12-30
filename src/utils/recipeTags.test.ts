import { describe, it, expect } from "vitest";
import { RECIPE_TAGS, getTagsByCategory, getAllTags } from "./recipeTags";
import type { RecipeTagKey } from "./recipeTags";

describe("recipeTags", () => {
    describe("RECIPE_TAGS", () => {
        it("should have tags defined", () => {
            expect(Object.keys(RECIPE_TAGS).length).toBeGreaterThan(0);
        });

        it("should have valid tag structure", () => {
            Object.entries(RECIPE_TAGS).forEach(([key, value]) => {
                expect(typeof key).toBe("string");
                expect(typeof value).toBe("string");
                expect(value.length).toBeGreaterThan(0);
            });
        });

        it("should include common diet labels", () => {
            expect(RECIPE_TAGS.balanced).toBeDefined();
            expect(RECIPE_TAGS.high_protein).toBeDefined();
            expect(RECIPE_TAGS.low_carb).toBeDefined();
        });

        it("should include health labels", () => {
            expect(RECIPE_TAGS.vegan).toBeDefined();
            expect(RECIPE_TAGS.vegetarian).toBeDefined();
            expect(RECIPE_TAGS.gluten_free).toBeDefined();
        });

        it("should include meal types", () => {
            expect(RECIPE_TAGS.breakfast).toBeDefined();
            expect(RECIPE_TAGS.lunch).toBeDefined();
            expect(RECIPE_TAGS.dinner).toBeDefined();
        });
    });

    describe("getTagsByCategory", () => {
        it("should return tags grouped by category", () => {
            const categories = getTagsByCategory();
            expect(Object.keys(categories).length).toBeGreaterThan(0);
        });

        it("should have Meal Types category", () => {
            const categories = getTagsByCategory();
            expect(categories["Meal Types"]).toBeDefined();
            expect(Array.isArray(categories["Meal Types"])).toBe(true);
        });

        it("should have all categories", () => {
            const categories = getTagsByCategory();
            expect(categories["Diet Labels"]).toBeDefined();
            expect(categories["Health Labels"]).toBeDefined();
            expect(categories["Allergen-Free"]).toBeDefined();
            expect(categories["Meal Types"]).toBeDefined();
            expect(categories["Cuisine Types"]).toBeDefined();
            expect(categories["Cooking Methods"]).toBeDefined();
            expect(categories["Other"]).toBeDefined();
        });

        it("should have valid tag keys in categories", () => {
            const categories = getTagsByCategory();
            Object.values(categories).forEach(tagKeys => {
                expect(Array.isArray(tagKeys)).toBe(true);
                tagKeys.forEach(tagKey => {
                    expect(RECIPE_TAGS[tagKey as RecipeTagKey]).toBeDefined();
                });
            });
        });
    });

    describe("getAllTags", () => {
        it("should return all tags as array", () => {
            const tags = getAllTags();
            expect(Array.isArray(tags)).toBe(true);
            expect(tags.length).toBeGreaterThan(0);
        });

        it("should have valid tag structure", () => {
            const tags = getAllTags();
            tags.forEach(tag => {
                expect(tag).toHaveProperty("key");
                expect(tag).toHaveProperty("label");
                expect(typeof tag.key).toBe("string");
                expect(typeof tag.label).toBe("string");
            });
        });

        it("should include all tags from RECIPE_TAGS", () => {
            const tags = getAllTags();
            const tagKeys = tags.map(t => t.key);
            Object.keys(RECIPE_TAGS).forEach(key => {
                expect(tagKeys).toContain(key);
            });
        });
    });
});
