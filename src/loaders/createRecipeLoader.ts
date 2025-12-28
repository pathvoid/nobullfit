import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";

// Loader for Create Recipe page - requires authentication
const createRecipeLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    
    return {
        ...data,
        title: "Create Recipe - NoBullFit",
        meta: [
            { name: "description", content: "Create a new recipe" }
        ]
    };
};

export default createRecipeLoader;

