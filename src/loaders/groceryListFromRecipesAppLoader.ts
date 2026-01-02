import { generateSEOTags } from "@utils/seo";
import type { MetaTag } from "../types/helmet";

interface LoaderData {
    title: string;
    meta: MetaTag[];
}

// Grocery list from recipes app page loader - sets page metadata for SEO
const groceryListFromRecipesAppLoader = async (): Promise<LoaderData> => {
    return {
        title: "Build a Grocery List From Recipes (Meal Prep Without Friction) - NoBullFit",
        meta: generateSEOTags({
            title: "Build a Grocery List From Recipes (Meal Prep Without Friction)",
            description: "Learn how a grocery list from recipes app streamlines meal prep. Connect recipes to shopping lists automatically, manage multiple lists, and go from planning to logging meals seamlessly.",
            path: "/grocery-list-from-recipes-app",
            keywords: [
                "grocery list from recipes app",
                "grocery list from recipes",
                "recipes grocery list",
                "meal prep app",
                "meal planning",
                "recipe to grocery list",
                "shopping list from recipes"
            ]
        })
    };
};

export default groceryListFromRecipesAppLoader;
