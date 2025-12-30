// Recipe tags based on Edamam Food API categories
// These tags will be used for filtering and searching recipes

export const RECIPE_TAGS = {
    // Diet Labels
    balanced: "Balanced",
    high_protein: "High-Protein",
    high_fiber: "High-Fiber",
    low_carb: "Low-Carb",
    low_fat: "Low-Fat",
    low_sodium: "Low-Sodium",
    low_sugar: "Low-Sugar",
    
    // Health Labels
    vegan: "Vegan",
    vegetarian: "Vegetarian",
    pescatarian: "Pescatarian",
    paleo: "Paleo",
    primal: "Primal",
    whole30: "Whole30",
    ketogenic: "Ketogenic",
    
    // Allergen-Free
    gluten_free: "Gluten-Free",
    dairy_free: "Dairy-Free",
    egg_free: "Egg-Free",
    soy_free: "Soy-Free",
    fish_free: "Fish-Free",
    shellfish_free: "Shellfish-Free",
    tree_nut_free: "Tree Nut-Free",
    peanut_free: "Peanut-Free",
    sesame_free: "Sesame-Free",
    
    // Meal Types
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
    dessert: "Dessert",
    appetizer: "Appetizer",
    side_dish: "Side Dish",
    
    // Cuisine Types
    american: "American",
    italian: "Italian",
    mexican: "Mexican",
    asian: "Asian",
    mediterranean: "Mediterranean",
    indian: "Indian",
    french: "French",
    chinese: "Chinese",
    japanese: "Japanese",
    thai: "Thai",
    greek: "Greek",
    middle_eastern: "Middle Eastern",
    
    // Cooking Methods
    baked: "Baked",
    grilled: "Grilled",
    fried: "Fried",
    steamed: "Steamed",
    roasted: "Roasted",
    slow_cooked: "Slow-Cooked",
    raw: "Raw",
    no_cook: "No-Cook",
    
    // Other
    quick: "Quick",
    easy: "Easy",
    one_pot: "One-Pot",
    meal_prep: "Meal Prep",
    kid_friendly: "Kid-Friendly",
    party: "Party",
    comfort_food: "Comfort Food"
} as const;

export type RecipeTagKey = keyof typeof RECIPE_TAGS;

// Get all tags as an array for selection
export function getAllTags(): Array<{ key: RecipeTagKey; label: string }> {
    return Object.entries(RECIPE_TAGS).map(([key, label]) => ({
        key: key as RecipeTagKey,
        label
    }));
}

// Get tags by category (for organized display)
export function getTagsByCategory() {
    return {
        "Diet Labels": [
            "balanced", "high_protein", "high_fiber", "low_carb", "low_fat", 
            "low_sodium", "low_sugar"
        ] as RecipeTagKey[],
        "Health Labels": [
            "vegan", "vegetarian", "pescatarian", "paleo", "primal", 
            "whole30", "ketogenic"
        ] as RecipeTagKey[],
        "Allergen-Free": [
            "gluten_free", "dairy_free", "egg_free", "soy_free", "fish_free",
            "shellfish_free", "tree_nut_free", "peanut_free", "sesame_free"
        ] as RecipeTagKey[],
        "Meal Types": [
            "breakfast", "lunch", "dinner", "snack", "dessert", 
            "appetizer", "side_dish"
        ] as RecipeTagKey[],
        "Cuisine Types": [
            "american", "italian", "mexican", "asian", "mediterranean",
            "indian", "french", "chinese", "japanese", "thai", "greek", "middle_eastern"
        ] as RecipeTagKey[],
        "Cooking Methods": [
            "baked", "grilled", "fried", "steamed", "roasted",
            "slow_cooked", "raw", "no_cook"
        ] as RecipeTagKey[],
        "Other": [
            "quick", "easy", "one_pot", "meal_prep", "kid_friendly",
            "party", "comfort_food"
        ] as RecipeTagKey[]
    };
}
