import { describe, it, expect } from "vitest";
import { COUNTRIES } from "./countries";

describe("countries", () => {
    describe("COUNTRIES", () => {
        it("should be an array of strings", () => {
            expect(Array.isArray(COUNTRIES)).toBe(true);
            COUNTRIES.forEach(country => {
                expect(typeof country).toBe("string");
            });
        });

        it("should have a reasonable number of countries", () => {
            // There are ~195 countries in the world
            expect(COUNTRIES.length).toBeGreaterThan(100);
            expect(COUNTRIES.length).toBeLessThan(250);
        });

        it("should contain major countries", () => {
            expect(COUNTRIES).toContain("United States");
            expect(COUNTRIES).toContain("United Kingdom");
            expect(COUNTRIES).toContain("Canada");
            expect(COUNTRIES).toContain("Australia");
            expect(COUNTRIES).toContain("Germany");
            expect(COUNTRIES).toContain("France");
            expect(COUNTRIES).toContain("Japan");
            expect(COUNTRIES).toContain("China");
            expect(COUNTRIES).toContain("India");
            expect(COUNTRIES).toContain("Brazil");
        });

        it("should be sorted alphabetically", () => {
            const sortedCountries = [...COUNTRIES].sort((a, b) =>
                a.localeCompare(b, "en", { sensitivity: "base" })
            );
            expect(COUNTRIES).toEqual(sortedCountries);
        });

        it("should have unique entries (no duplicates)", () => {
            const uniqueCountries = new Set(COUNTRIES);
            expect(uniqueCountries.size).toBe(COUNTRIES.length);
        });

        it("should not have empty strings", () => {
            COUNTRIES.forEach(country => {
                expect(country.trim().length).toBeGreaterThan(0);
            });
        });

        it("should start with Afghanistan (first alphabetically)", () => {
            expect(COUNTRIES[0]).toBe("Afghanistan");
        });

        it("should end with Zimbabwe (last alphabetically)", () => {
            expect(COUNTRIES[COUNTRIES.length - 1]).toBe("Zimbabwe");
        });

        it("should contain European countries", () => {
            expect(COUNTRIES).toContain("Belgium");
            expect(COUNTRIES).toContain("Netherlands");
            expect(COUNTRIES).toContain("Spain");
            expect(COUNTRIES).toContain("Italy");
            expect(COUNTRIES).toContain("Poland");
            expect(COUNTRIES).toContain("Sweden");
        });

        it("should contain Asian countries", () => {
            expect(COUNTRIES).toContain("South Korea");
            expect(COUNTRIES).toContain("Thailand");
            expect(COUNTRIES).toContain("Vietnam");
            expect(COUNTRIES).toContain("Indonesia");
            expect(COUNTRIES).toContain("Philippines");
        });

        it("should contain African countries", () => {
            expect(COUNTRIES).toContain("South Africa");
            expect(COUNTRIES).toContain("Nigeria");
            expect(COUNTRIES).toContain("Kenya");
            expect(COUNTRIES).toContain("Egypt");
            expect(COUNTRIES).toContain("Morocco");
        });

        it("should contain South American countries", () => {
            expect(COUNTRIES).toContain("Argentina");
            expect(COUNTRIES).toContain("Chile");
            expect(COUNTRIES).toContain("Colombia");
            expect(COUNTRIES).toContain("Peru");
            expect(COUNTRIES).toContain("Venezuela");
        });
    });
});
