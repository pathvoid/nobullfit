import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Edit Recipe page - requires authentication
const editRecipeLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    const { recipeId } = args.params;
    
    if (!recipeId) {
        return {
            ...data,
            title: "Edit Recipe - NoBullFit",
            meta: generateSEOTags({
                title: "Edit Recipe",
                description: "Edit your recipe.",
                path: "/dashboard/recipes/edit",
                noIndex: true
            }),
            error: "Recipe ID is required"
        };
    }

    return {
        ...data,
        title: "Edit Recipe - NoBullFit",
        meta: generateSEOTags({
            title: "Edit Recipe",
            description: "Edit your recipe with updated ingredients and nutritional information.",
            path: `/dashboard/recipes/edit/${recipeId}`,
            noIndex: true
        })
    };
};

export default editRecipeLoader;
