import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Food Database page - requires authentication
const foodDatabaseLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    return {
        ...data,
        title: "Food Database - NoBullFit",
        meta: generateSEOTags({
            title: "Food Database",
            description: "Search our comprehensive food database with nutritional information. Find calories, macros, and micronutrients for thousands of foods.",
            path: "/dashboard/food-database",
            noIndex: true
        })
    };
};

export default foodDatabaseLoader;
