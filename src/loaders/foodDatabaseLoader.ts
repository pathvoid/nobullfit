import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";

// Loader for Food Database page - requires authentication
const foodDatabaseLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    return {
        ...data,
        title: "Food Database - NoBullFit",
        meta: [
            { name: "description", content: "Browse and search the food database" }
        ]
    };
};

export default foodDatabaseLoader;
