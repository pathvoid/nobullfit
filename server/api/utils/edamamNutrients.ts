// Utility functions for calculating nutrients using Edamam API

interface EdamamNutrientsRequest {
    ingredients: Array<{
        quantity: number;
        measureURI: string;
        foodId: string;
    }>;
}

interface EdamamNutrientsResponse {
    calories: number;
    totalNutrients: {
        [key: string]: {
            label: string;
            quantity: number;
            unit: string;
        };
    };
}

// Calculate nutrients for a food item using Edamam API
export async function calculateNutrientsForFood(
    foodId: string,
    quantity: number,
    measureUri: string
): Promise<EdamamNutrientsResponse | null> {
    const appId = process.env.EDAMAM_APP_ID;
    const appKey = process.env.EDAMAM_APP_KEY;

    if (!appId || !appKey) {
        throw new Error("Edamam API credentials not configured");
    }

    const requestBody: EdamamNutrientsRequest = {
        ingredients: [
            {
                quantity,
                measureURI: measureUri,
                foodId: foodId
            }
        ]
    };

    const baseUrl = "https://api.edamam.com/api/food-database/v2/nutrients";
    const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey
    });
    const apiUrl = `${baseUrl}?${params.toString()}`;

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "Accept-Encoding": "gzip"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Edamam API error:", errorText);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error calculating nutrients:", error);
        return null;
    }
}

// Convert Edamam nutrients response to our nutrients format
export function convertEdamamNutrientsToOurFormat(
    edamamResponse: EdamamNutrientsResponse
): Record<string, number> {
    const nutrients: Record<string, number> = {};

    if (edamamResponse.calories !== undefined) {
        nutrients.ENERC_KCAL = edamamResponse.calories;
    }

    if (edamamResponse.totalNutrients) {
        // Map Edamam nutrient codes to our format
        const nutrientMap: Record<string, string> = {
            "PROCNT": "PROCNT",
            "FAT": "FAT",
            "CHOCDF": "CHOCDF",
            "FIBTG": "FIBTG",
            "SUGAR": "SUGAR",
            "NA": "NA",
            "CA": "CA",
            "FE": "FE",
            "K": "K",
            "MG": "MG",
            "P": "P",
            "ZN": "ZN",
            "VITC": "VITC",
            "THIA": "THIA",
            "RIBF": "RIBF",
            "NIA": "NIA",
            "VITB6A": "VITB6A",
            "FOLDFE": "FOLDFE",
            "VITB12": "VITB12",
            "VITD": "VITD",
            "VITK1": "VITK1",
            "TOCPHA": "TOCPHA",
            "VITA_RAE": "VITA_RAE",
            "CHOLE": "CHOLE",
            "FASAT": "FASAT",
            "FAMS": "FAMS",
            "FAPU": "FAPU",
            "WATER": "WATER"
        };

        for (const [key, value] of Object.entries(edamamResponse.totalNutrients)) {
            const mappedKey = nutrientMap[key];
            if (mappedKey && value.quantity !== undefined) {
                nutrients[mappedKey] = value.quantity;
            }
        }
    }

    return nutrients;
}
