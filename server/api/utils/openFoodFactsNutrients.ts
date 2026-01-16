// Utility functions for calculating nutrients using OpenFoodFacts data

// Food data interface (matching the frontend format)
interface OFFFoodData {
    foodId: string;
    label: string;
    nutrients?: {
        ENERC_KCAL?: number;
        PROCNT?: number;
        FAT?: number;
        CHOCDF?: number;
        FIBTG?: number;
        SUGAR?: number;
        NA?: number;
        CA?: number;
        FE?: number;
        K?: number;
        MG?: number;
        P?: number;
        ZN?: number;
        VITC?: number;
        THIA?: number;
        RIBF?: number;
        NIA?: number;
        VITB6A?: number;
        FOLDFE?: number;
        VITB12?: number;
        VITD?: number;
        VITK1?: number;
        TOCPHA?: number;
        VITA_RAE?: number;
        CHOLE?: number;
        FASAT?: number;
        FAMS?: number;
        FAPU?: number;
        WATER?: number;
        [key: string]: number | undefined;
    };
    measures?: Array<{
        uri: string;
        label: string;
        weight: number;
    }>;
}

// Calculate nutrients for a food item based on quantity and measure
export function calculateNutrientsForFood(
    foodData: OFFFoodData,
    quantity: number,
    measureUri: string
): Record<string, number> | null {
    if (!foodData.nutrients) {
        return null;
    }

    // Find the measure weight
    const measure = foodData.measures?.find(m => m.uri === measureUri);
    const measureWeight = measure?.weight || 100;

    // Calculate multiplier (nutrients are per 100g)
    const multiplier = (quantity * measureWeight) / 100;

    const nutrients: Record<string, number> = {};

    // Apply multiplier to all nutrient values
    Object.entries(foodData.nutrients).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            nutrients[key] = value * multiplier;
        }
    });

    return nutrients;
}

// Convert nutrients to our standard format (for compatibility)
export function convertNutrientsToOurFormat(
    rawNutrients: Record<string, number>
): Record<string, number> {
    // The nutrients are already in our format, just return them
    return rawNutrients;
}
