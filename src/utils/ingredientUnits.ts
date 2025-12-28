// Ingredient unit types and conversion utilities

export interface Ingredient {
    quantity: number | string | null; // Can be number, fraction string (e.g., "1/3"), or null
    unit: string;
    name: string;
}

// Common cooking units
export const UNITS = {
    // Volume - Metric
    ml: { label: "ml", category: "volume", system: "metric" },
    l: { label: "L", category: "volume", system: "metric" },
    
    // Volume - Imperial
    tsp: { label: "tsp", category: "volume", system: "imperial" },
    tbsp: { label: "tbsp", category: "volume", system: "imperial" },
    fl_oz: { label: "fl oz", category: "volume", system: "imperial" },
    cup: { label: "cup", category: "volume", system: "imperial" },
    pint: { label: "pint", category: "volume", system: "imperial" },
    quart: { label: "quart", category: "volume", system: "imperial" },
    gallon: { label: "gallon", category: "volume", system: "imperial" },
    
    // Weight - Metric
    g: { label: "g", category: "weight", system: "metric" },
    kg: { label: "kg", category: "weight", system: "metric" },
    
    // Weight - Imperial
    oz: { label: "oz", category: "weight", system: "imperial" },
    lb: { label: "lb", category: "weight", system: "imperial" },
    
    // Count/Other
    piece: { label: "piece", category: "count", system: "both" },
    pieces: { label: "pieces", category: "count", system: "both" },
    whole: { label: "whole", category: "count", system: "both" },
    pinch: { label: "pinch", category: "other", system: "both" },
    dash: { label: "dash", category: "other", system: "both" },
    to_taste: { label: "to taste", category: "other", system: "both" }
} as const;

export type UnitKey = keyof typeof UNITS;

// Conversion factors (approximate, for common conversions)
const CONVERSIONS: Record<string, { to: string; factor: number }[]> = {
    // Volume conversions
    ml: [{ to: "fl_oz", factor: 0.033814 }],
    l: [{ to: "cup", factor: 4.22675 }, { to: "fl_oz", factor: 33.814 }],
    tsp: [{ to: "ml", factor: 4.92892 }],
    tbsp: [{ to: "ml", factor: 14.7868 }, { to: "tsp", factor: 3 }],
    fl_oz: [{ to: "ml", factor: 29.5735 }],
    cup: [{ to: "ml", factor: 236.588 }, { to: "l", factor: 0.236588 }],
    
    // Weight conversions
    g: [{ to: "oz", factor: 0.035274 }],
    kg: [{ to: "lb", factor: 2.20462 }, { to: "oz", factor: 35.274 }],
    oz: [{ to: "g", factor: 28.3495 }],
    lb: [{ to: "g", factor: 453.592 }, { to: "kg", factor: 0.453592 }]
};

// Parse fraction string to decimal (e.g., "1/3" -> 0.333, "2 1/2" -> 2.5)
export function parseFraction(fractionStr: string | number | null): number | null {
    if (fractionStr === null) {
        return null;
    }
    
    if (typeof fractionStr === "number") {
        return fractionStr;
    }
    
    const str = fractionStr.toString().trim();
    if (!str) return null;
    
    // Check if it's already a decimal number
    const decimalMatch = str.match(/^\d*\.?\d+$/);
    if (decimalMatch) {
        return parseFloat(str);
    }
    
    // Parse mixed number (e.g., "2 1/2")
    const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
        const whole = parseInt(mixedMatch[1], 10);
        const numerator = parseInt(mixedMatch[2], 10);
        const denominator = parseInt(mixedMatch[3], 10);
        return whole + (numerator / denominator);
    }
    
    // Parse simple fraction (e.g., "1/3")
    const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
        const numerator = parseInt(fractionMatch[1], 10);
        const denominator = parseInt(fractionMatch[2], 10);
        return denominator !== 0 ? numerator / denominator : 0;
    }
    
    // Try to parse as regular number
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

// Format decimal to fraction string (for display, approximate)
export function formatFraction(decimal: number): string | number {
    // Common fractions
    const commonFractions: Array<[number, string]> = [
        [0.125, "1/8"],
        [0.25, "1/4"],
        [0.333, "1/3"],
        [0.5, "1/2"],
        [0.667, "2/3"],
        [0.75, "3/4"]
    ];
    
    // Check for whole numbers first
    if (Number.isInteger(decimal)) {
        return decimal;
    }
    
    // Check for exact matches
    for (const [value, fraction] of commonFractions) {
        if (Math.abs(decimal - value) < 0.01) {
            return fraction;
        }
    }
    
    // Check for whole numbers with fractions
    const whole = Math.floor(decimal);
    const remainder = decimal - whole;
    
    if (whole > 0 && remainder > 0.01) {
        for (const [value, fraction] of commonFractions) {
            if (Math.abs(remainder - value) < 0.01) {
                return `${whole} ${fraction}`;
            }
        }
    }
    
    // Return as decimal for non-standard fractions
    return decimal;
}

// Unit system types
export type UnitSystem = "metric" | "imperial" | "hybrid";

// Convert ingredient from one unit system to another
export function convertIngredient(
    ingredient: Ingredient,
    targetSystem: UnitSystem
): Ingredient {
    // Hybrid system keeps original units as entered (common in Canada)
    if (targetSystem === "hybrid") {
        return ingredient;
    }

    // If no quantity, return as-is
    if (ingredient.quantity === null) {
        return ingredient;
    }
    
    const currentUnit = UNITS[ingredient.unit as UnitKey];
    if (!currentUnit) {
        return ingredient;
    }
    
    // If already in target system or unit doesn't have a system, return as-is
    if (currentUnit.system === targetSystem || currentUnit.system === "both") {
        return ingredient;
    }
    
    // Find conversion - check if unit key exists
    const unitKey = ingredient.unit as UnitKey;
    if (!(unitKey in UNITS)) {
        return ingredient;
    }
    
    const conversions = CONVERSIONS[unitKey];
    if (!conversions || conversions.length === 0) {
        return ingredient;
    }
    
    // Find target unit in same category
    const targetConversion = conversions.find(conv => {
        // Find unit key that matches the conversion target
        const targetUnitEntry = Object.entries(UNITS).find(([key, _]) => key === conv.to);
        if (!targetUnitEntry) return false;
        const targetUnit = UNITS[targetUnitEntry[0] as UnitKey];
        return targetUnit.system === targetSystem || targetUnit.system === "both";
    });
    
    if (!targetConversion) {
        return ingredient;
    }
    
    // Parse quantity (handle fractions)
    const quantityDecimal = parseFraction(ingredient.quantity);
    if (quantityDecimal === null) {
        return ingredient;
    }
    const convertedQuantity = quantityDecimal * targetConversion.factor;
    
    // Format converted quantity (try to use fraction if it's a common one)
    const formattedQuantity = formatFraction(convertedQuantity);
    
    return {
        quantity: formattedQuantity,
        unit: targetConversion.to,
        name: ingredient.name
    };
}

// Get units by category and system
export function getUnitsByCategory(
    category: "volume" | "weight" | "count" | "other",
    system?: "metric" | "imperial"
): Array<{ key: UnitKey; label: string }> {
    return Object.entries(UNITS)
        .filter(([_, unit]) => {
            if (category !== unit.category) return false;
            if (!system) return true;
            return unit.system === system || unit.system === "both";
        })
        .map(([key, unit]) => ({
            key: key as UnitKey,
            label: unit.label
        }));
}

// Get all units for a select dropdown
export function getAllUnits(): Array<{ key: UnitKey; label: string; category: string }> {
    return Object.entries(UNITS).map(([key, unit]) => ({
        key: key as UnitKey,
        label: unit.label,
        category: unit.category
    }));
}

// Base units for each category (used for normalization)
const BASE_UNITS: Record<string, UnitKey> = {
    volume: "ml",
    weight: "g",
    count: "piece",
    other: "piece" // fallback
};

// Conversion factors to base units (ml for volume, g for weight)
const TO_BASE_UNIT: Record<string, number> = {
    // Volume to ml
    ml: 1,
    l: 1000,
    tsp: 4.92892,
    tbsp: 14.7868,
    fl_oz: 29.5735,
    cup: 236.588,
    pint: 473.176,
    quart: 946.353,
    gallon: 3785.41,
    // Weight to g
    g: 1,
    kg: 1000,
    oz: 28.3495,
    lb: 453.592,
    // Count (no conversion)
    piece: 1,
    pieces: 1,
    whole: 1,
    pinch: 1,
    dash: 1,
    to_taste: 1
};

// Normalize a unit string to a standard unit key
export function normalizeUnit(unit: string): UnitKey | null {
    if (!unit) return null;
    
    const lowerUnit = unit.toLowerCase().trim();
    
    // Direct match
    if (lowerUnit in UNITS) {
        return lowerUnit as UnitKey;
    }
    
    // Common aliases
    const aliases: Record<string, UnitKey> = {
        "milliliter": "ml",
        "milliliters": "ml",
        "millilitre": "ml",
        "millilitres": "ml",
        "liter": "l",
        "liters": "l",
        "litre": "l",
        "litres": "l",
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
        "fluid ounce": "fl_oz",
        "fluid ounces": "fl_oz",
        "fl oz": "fl_oz",
        "cups": "cup",
        "pints": "pint",
        "quarts": "quart",
        "gallons": "gallon",
        "gram": "g",
        "grams": "g",
        "kilogram": "kg",
        "kilograms": "kg",
        "ounce": "oz",
        "ounces": "oz",
        "pound": "lb",
        "pounds": "lb",
        "lbs": "lb"
    };
    
    if (lowerUnit in aliases) {
        return aliases[lowerUnit];
    }
    
    return null;
}

// Check if two units are compatible (same category)
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
    const normalizedUnit1 = normalizeUnit(unit1);
    const normalizedUnit2 = normalizeUnit(unit2);
    
    if (!normalizedUnit1 || !normalizedUnit2) {
        // If units can't be normalized, check if they're the same string
        return unit1.toLowerCase().trim() === unit2.toLowerCase().trim();
    }
    
    const unitInfo1 = UNITS[normalizedUnit1];
    const unitInfo2 = UNITS[normalizedUnit2];
    
    return unitInfo1.category === unitInfo2.category;
}

// Convert a quantity from one unit to another (both must be in same category)
export function convertQuantity(
    quantity: number,
    fromUnit: string,
    toUnit: string
): number | null {
    const normalizedFrom = normalizeUnit(fromUnit);
    const normalizedTo = normalizeUnit(toUnit);
    
    if (!normalizedFrom || !normalizedTo) {
        return null;
    }
    
    const fromInfo = UNITS[normalizedFrom];
    const toInfo = UNITS[normalizedTo];
    
    // Units must be in the same category
    if (fromInfo.category !== toInfo.category) {
        return null;
    }
    
    // Get conversion factors
    const fromToBase = TO_BASE_UNIT[normalizedFrom];
    const toToBase = TO_BASE_UNIT[normalizedTo];
    
    if (fromToBase === undefined || toToBase === undefined) {
        return null;
    }
    
    // Convert: quantity -> base unit -> target unit
    const baseQuantity = quantity * fromToBase;
    const targetQuantity = baseQuantity / toToBase;
    
    return targetQuantity;
}

// Add two quantities, handling unit conversion
// Returns the result in the first unit (or the larger unit if specified)
export function addQuantities(
    quantity1: number | string | null,
    unit1: string,
    quantity2: number | string | null,
    unit2: string,
    preferLargerUnit: boolean = true
): { quantity: number; unit: string } | null {
    // Parse quantities
    const qty1 = parseFraction(quantity1);
    const qty2 = parseFraction(quantity2);
    
    if (qty1 === null && qty2 === null) {
        return null;
    }
    
    // If one quantity is null, return the other
    if (qty1 === null) {
        return { quantity: qty2!, unit: unit2 };
    }
    if (qty2 === null) {
        return { quantity: qty1, unit: unit1 };
    }
    
    // If units are the same, just add
    const normalizedUnit1 = normalizeUnit(unit1);
    const normalizedUnit2 = normalizeUnit(unit2);
    
    if (normalizedUnit1 === normalizedUnit2) {
        return { quantity: qty1 + qty2, unit: unit1 };
    }
    
    // Check if units are compatible
    if (!areUnitsCompatible(unit1, unit2)) {
        // Incompatible units - can't add, return first quantity
        return null;
    }
    
    // Determine target unit (prefer larger unit to avoid decimals like 1100ml -> 1.1L)
    let targetUnit = unit1;
    let targetNormalized = normalizedUnit1;
    
    if (preferLargerUnit && normalizedUnit1 && normalizedUnit2) {
        const toBase1 = TO_BASE_UNIT[normalizedUnit1] || 1;
        const toBase2 = TO_BASE_UNIT[normalizedUnit2] || 1;
        
        // Use the unit with larger conversion factor (e.g., L over ml)
        if (toBase2 > toBase1) {
            targetUnit = unit2;
            targetNormalized = normalizedUnit2;
        }
    }
    
    // Convert qty1 to target unit
    const convertedQty1 = normalizedUnit1 === targetNormalized 
        ? qty1 
        : convertQuantity(qty1, unit1, targetUnit);
    
    // Convert qty2 to target unit
    const convertedQty2 = normalizedUnit2 === targetNormalized 
        ? qty2 
        : convertQuantity(qty2, unit2, targetUnit);
    
    if (convertedQty1 === null || convertedQty2 === null) {
        return null;
    }
    
    return {
        quantity: convertedQty1 + convertedQty2,
        unit: targetUnit
    };
}

// Generate a unique food ID for a recipe ingredient
export function generateIngredientFoodId(ingredientName: string): string {
    // Create a consistent ID from the ingredient name
    const normalized = ingredientName.toLowerCase().trim().replace(/\s+/g, "_");
    return `ingredient_${normalized}`;
}

// Format a quantity for display (rounds to reasonable precision)
export function formatQuantityForDisplay(quantity: number, unit: string): string {
    const normalizedUnit = normalizeUnit(unit);
    
    // For small units (ml, g, tsp), round to whole numbers
    if (normalizedUnit && ["ml", "g", "tsp", "tbsp"].includes(normalizedUnit)) {
        return Math.round(quantity).toString();
    }
    
    // For medium units (cup, oz), round to 2 decimal places
    if (quantity === Math.floor(quantity)) {
        return quantity.toString();
    }
    
    // Try to format as fraction
    const formatted = formatFraction(quantity);
    if (typeof formatted === "string") {
        return formatted;
    }
    
    // Round to 2 decimal places
    return Number(quantity.toFixed(2)).toString();
}
