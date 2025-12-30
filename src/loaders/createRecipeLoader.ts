import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Create Recipe page - requires authentication
const createRecipeLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    
    return {
        ...data,
        title: "Create Recipe - NoBullFit",
        meta: generateSEOTags({
            title: "Create Recipe",
            description: "Create a new recipe with detailed nutritional information. Share your healthy creations with the community.",
            path: "/dashboard/recipes/create",
            noIndex: true
        })
    };
};

export default createRecipeLoader;
