import { describe, it, expect } from "vitest";
import { 
    convertIngredient, 
    parseFraction, 
    formatFraction, 
    getAllUnits, 
    UNITS,
    normalizeUnit,
    areUnitsCompatible,
    convertQuantity,
    addQuantities,
    generateIngredientFoodId,
    formatQuantityForDisplay
} from "./ingredientUnits";
import type { Ingredient } from "./ingredientUnits";

describe("ingredientUnits", () => {
    describe("parseFraction", () => {
        it("should parse whole numbers", () => {
            expect(parseFraction("5")).toBe(5);
            expect(parseFraction("10")).toBe(10);
        });

        it("should parse simple fractions", () => {
            expect(parseFraction("1/2")).toBeCloseTo(0.5);
            expect(parseFraction("1/3")).toBeCloseTo(0.333, 2);
            expect(parseFraction("2/3")).toBeCloseTo(0.667, 2);
            expect(parseFraction("3/4")).toBeCloseTo(0.75);
        });

        it("should parse mixed numbers", () => {
            expect(parseFraction("1 1/2")).toBeCloseTo(1.5);
            expect(parseFraction("2 1/3")).toBeCloseTo(2.333, 2);
            expect(parseFraction("3 2/3")).toBeCloseTo(3.667, 2);
        });

        it("should return null for invalid input", () => {
            expect(parseFraction("invalid")).toBeNull();
            expect(parseFraction("")).toBeNull();
            expect(parseFraction("abc/def")).toBeNull();
        });
    });

    describe("formatFraction", () => {
        it("should format whole numbers", () => {
            expect(formatFraction(5)).toBe(5);
            expect(formatFraction(10)).toBe(10);
        });

        it("should format common fractions", () => {
            expect(formatFraction(0.5)).toBe("1/2");
            expect(formatFraction(0.25)).toBe("1/4");
            expect(formatFraction(0.75)).toBe("3/4");
            expect(formatFraction(0.333)).toBe("1/3");
            expect(formatFraction(0.667)).toBe("2/3");
        });

        it("should format mixed numbers", () => {
            expect(formatFraction(1.5)).toBe("1 1/2");
            expect(formatFraction(2.25)).toBe("2 1/4");
            expect(formatFraction(3.75)).toBe("3 3/4");
        });

        it("should return decimal for non-standard fractions", () => {
            // Values far from any common fraction should be returned as decimals
            // 0.123 is close enough to 0.125 (1/8) to match, so test with a value further from any fraction
            const result1 = formatFraction(0.15);  // Not close to any common fraction
            const result2 = formatFraction(1.87);  // Not close to any common fraction
            // These should be returned as numbers, not strings
            expect(typeof result1).toBe("number");
            expect(typeof result2).toBe("number");
            expect(result1).toBeCloseTo(0.15, 2);
            expect(result2).toBeCloseTo(1.87, 2);
        });
    });

    describe("convertIngredient", () => {
        it("should convert grams to ounces", () => {
            const ingredient: Ingredient = { quantity: 100, unit: "g", name: "flour" };
            const converted = convertIngredient(ingredient, "imperial");
            expect(converted.unit).toBe("oz");
            expect(converted.quantity).toBeCloseTo(3.527, 1);
        });

        it("should convert ounces to grams", () => {
            const ingredient: Ingredient = { quantity: 1, unit: "oz", name: "flour" };
            const converted = convertIngredient(ingredient, "metric");
            expect(converted.unit).toBe("g");
            expect(converted.quantity).toBeCloseTo(28.35, 1);
        });

        it("should convert milliliters to fluid ounces", () => {
            const ingredient: Ingredient = { quantity: 250, unit: "ml", name: "milk" };
            const converted = convertIngredient(ingredient, "imperial");
            expect(converted.unit).toBe("fl_oz");
            expect(converted.quantity).toBeCloseTo(8.45, 1);
        });

        it("should convert cups to milliliters", () => {
            const ingredient: Ingredient = { quantity: 1, unit: "cup", name: "water" };
            const converted = convertIngredient(ingredient, "metric");
            expect(converted.unit).toBe("ml");
            // 1 US cup = 236.588 ml
            expect(parseFloat(String(converted.quantity))).toBeCloseTo(236.59, 1);
        });

        it("should handle fractional quantities", () => {
            const ingredient: Ingredient = { quantity: "1/2", unit: "cup", name: "sugar" };
            const converted = convertIngredient(ingredient, "metric");
            expect(converted.unit).toBe("ml");
            // 0.5 US cup = 118.29 ml
            expect(parseFloat(String(converted.quantity))).toBeCloseTo(118.29, 1);
        });

        it("should return original if quantity is null", () => {
            const ingredient: Ingredient = { quantity: null, unit: "g", name: "salt" };
            const converted = convertIngredient(ingredient, "imperial");
            expect(converted).toEqual(ingredient);
        });

        it("should return original if unit doesn't need conversion", () => {
            const ingredient: Ingredient = { quantity: 1, unit: "piece", name: "egg" };
            const converted = convertIngredient(ingredient, "imperial");
            expect(converted).toEqual(ingredient);
        });

        it("should return original for hybrid system (mixed metric/imperial)", () => {
            const ingredientMetric: Ingredient = { quantity: 100, unit: "g", name: "flour" };
            const ingredientImperial: Ingredient = { quantity: 1, unit: "cup", name: "sugar" };
            
            // Hybrid system should keep original units as entered
            const convertedMetric = convertIngredient(ingredientMetric, "hybrid");
            const convertedImperial = convertIngredient(ingredientImperial, "hybrid");
            
            expect(convertedMetric).toEqual(ingredientMetric);
            expect(convertedImperial).toEqual(ingredientImperial);
        });
    });

    describe("getAllUnits", () => {
        it("should return all units", () => {
            const units = getAllUnits();
            expect(units.length).toBeGreaterThan(0);
            expect(units.every(u => u.key && u.label)).toBe(true);
        });

        it("should include common metric units", () => {
            const units = getAllUnits();
            const metricUnits = units.filter(u => UNITS[u.key as keyof typeof UNITS]?.system === "metric");
            expect(metricUnits.length).toBeGreaterThan(0);
        });

        it("should include common imperial units", () => {
            const units = getAllUnits();
            const imperialUnits = units.filter(u => UNITS[u.key as keyof typeof UNITS]?.system === "imperial");
            expect(imperialUnits.length).toBeGreaterThan(0);
        });
    });

    describe("normalizeUnit", () => {
        it("should normalize standard unit keys", () => {
            expect(normalizeUnit("ml")).toBe("ml");
            expect(normalizeUnit("l")).toBe("l");
            expect(normalizeUnit("g")).toBe("g");
            expect(normalizeUnit("cup")).toBe("cup");
        });

        it("should normalize unit aliases", () => {
            expect(normalizeUnit("milliliter")).toBe("ml");
            expect(normalizeUnit("milliliters")).toBe("ml");
            expect(normalizeUnit("liter")).toBe("l");
            expect(normalizeUnit("liters")).toBe("l");
            expect(normalizeUnit("gram")).toBe("g");
            expect(normalizeUnit("grams")).toBe("g");
            expect(normalizeUnit("cups")).toBe("cup");
            expect(normalizeUnit("pound")).toBe("lb");
            expect(normalizeUnit("pounds")).toBe("lb");
            expect(normalizeUnit("lbs")).toBe("lb");
        });

        it("should be case insensitive", () => {
            expect(normalizeUnit("ML")).toBe("ml");
            expect(normalizeUnit("Gram")).toBe("g");
            expect(normalizeUnit("CUPS")).toBe("cup");
        });

        it("should return null for unknown units", () => {
            expect(normalizeUnit("unknown")).toBeNull();
            expect(normalizeUnit("xyz")).toBeNull();
        });

        it("should handle empty and null input", () => {
            expect(normalizeUnit("")).toBeNull();
        });
    });

    describe("areUnitsCompatible", () => {
        it("should return true for same category units", () => {
            expect(areUnitsCompatible("ml", "l")).toBe(true);
            expect(areUnitsCompatible("cup", "ml")).toBe(true);
            expect(areUnitsCompatible("g", "kg")).toBe(true);
            expect(areUnitsCompatible("oz", "lb")).toBe(true);
        });

        it("should return false for different category units", () => {
            expect(areUnitsCompatible("ml", "g")).toBe(false);
            expect(areUnitsCompatible("cup", "oz")).toBe(false);
            expect(areUnitsCompatible("l", "kg")).toBe(false);
        });

        it("should handle unit aliases", () => {
            expect(areUnitsCompatible("milliliters", "liters")).toBe(true);
            expect(areUnitsCompatible("grams", "kilograms")).toBe(true);
        });

        it("should return true for identical string units", () => {
            expect(areUnitsCompatible("unknown", "unknown")).toBe(true);
        });
    });

    describe("convertQuantity", () => {
        it("should convert between volume units", () => {
            // 1L = 1000ml
            expect(convertQuantity(1, "l", "ml")).toBeCloseTo(1000);
            expect(convertQuantity(1000, "ml", "l")).toBeCloseTo(1);
            
            // 1 cup = 236.588 ml
            expect(convertQuantity(1, "cup", "ml")).toBeCloseTo(236.588, 0);
        });

        it("should convert between weight units", () => {
            // 1kg = 1000g
            expect(convertQuantity(1, "kg", "g")).toBeCloseTo(1000);
            expect(convertQuantity(1000, "g", "kg")).toBeCloseTo(1);
            
            // 1 lb = 453.592g
            expect(convertQuantity(1, "lb", "g")).toBeCloseTo(453.592, 0);
        });

        it("should return null for incompatible units", () => {
            expect(convertQuantity(1, "ml", "g")).toBeNull();
            expect(convertQuantity(1, "cup", "kg")).toBeNull();
        });

        it("should return null for unknown units", () => {
            expect(convertQuantity(1, "unknown", "ml")).toBeNull();
            expect(convertQuantity(1, "ml", "unknown")).toBeNull();
        });
    });

    describe("addQuantities", () => {
        it("should add same unit quantities", () => {
            const result = addQuantities(1, "cup", 2, "cup");
            expect(result).not.toBeNull();
            expect(result!.quantity).toBe(3);
            expect(result!.unit).toBe("cup");
        });

        it("should add compatible units with conversion", () => {
            // 1L + 100ml = 1.1L (prefer larger unit)
            const result = addQuantities(1, "l", 100, "ml");
            expect(result).not.toBeNull();
            expect(result!.quantity).toBeCloseTo(1.1, 1);
            expect(result!.unit).toBe("l");
        });

        it("should prefer larger unit for cleaner numbers", () => {
            // 100ml + 1L = 1.1L
            const result = addQuantities(100, "ml", 1, "l");
            expect(result).not.toBeNull();
            expect(result!.quantity).toBeCloseTo(1.1, 1);
            expect(result!.unit).toBe("l");
        });

        it("should add weight units with conversion", () => {
            // 500g + 1kg = 1.5kg
            const result = addQuantities(500, "g", 1, "kg");
            expect(result).not.toBeNull();
            expect(result!.quantity).toBeCloseTo(1.5, 1);
            expect(result!.unit).toBe("kg");
        });

        it("should return null for incompatible units", () => {
            const result = addQuantities(1, "ml", 1, "g");
            expect(result).toBeNull();
        });

        it("should handle null quantities", () => {
            expect(addQuantities(null, "ml", 100, "ml")!.quantity).toBe(100);
            expect(addQuantities(100, "ml", null, "ml")!.quantity).toBe(100);
            expect(addQuantities(null, "ml", null, "ml")).toBeNull();
        });

        it("should handle fraction strings", () => {
            const result = addQuantities("1/2", "cup", "1/2", "cup");
            expect(result).not.toBeNull();
            expect(result!.quantity).toBeCloseTo(1);
        });
    });

    describe("generateIngredientFoodId", () => {
        it("should generate consistent IDs", () => {
            expect(generateIngredientFoodId("Orange Juice")).toBe("ingredient_orange_juice");
            expect(generateIngredientFoodId("Flour")).toBe("ingredient_flour");
            expect(generateIngredientFoodId("All Purpose Flour")).toBe("ingredient_all_purpose_flour");
        });

        it("should normalize spacing", () => {
            expect(generateIngredientFoodId("  Orange   Juice  ")).toBe("ingredient_orange_juice");
        });

        it("should be case insensitive", () => {
            expect(generateIngredientFoodId("ORANGE JUICE")).toBe("ingredient_orange_juice");
            expect(generateIngredientFoodId("Orange JUICE")).toBe("ingredient_orange_juice");
        });
    });

    describe("formatQuantityForDisplay", () => {
        it("should round small units to whole numbers", () => {
            expect(formatQuantityForDisplay(100.5, "ml")).toBe("101");
            expect(formatQuantityForDisplay(50.3, "g")).toBe("50");
        });

        it("should format whole numbers simply", () => {
            expect(formatQuantityForDisplay(2, "cup")).toBe("2");
            expect(formatQuantityForDisplay(5, "l")).toBe("5");
        });

        it("should try to format as fractions", () => {
            expect(formatQuantityForDisplay(0.5, "cup")).toBe("1/2");
            expect(formatQuantityForDisplay(1.5, "cup")).toBe("1 1/2");
        });

        it("should round decimals to 2 places", () => {
            expect(formatQuantityForDisplay(1.234, "l")).toBe("1.23");
        });
    });
});

