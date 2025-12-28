import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";

// Loader for Edit Recipe page - requires authentication
const editRecipeLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    const { recipeId } = args.params;
    
    if (!recipeId) {
        return {
            ...data,
            title: "Edit Recipe - NoBullFit",
            meta: [
                { name: "description", content: "Edit your recipe" }
            ],
            error: "Recipe ID is required"
        };
    }

    return {
        ...data,
        title: "Edit Recipe - NoBullFit",
        meta: [
            { name: "description", content: "Edit your recipe" }
        ]
    };
};

export default editRecipeLoader;

