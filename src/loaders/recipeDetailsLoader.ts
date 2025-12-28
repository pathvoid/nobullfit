import type { LoaderFunctionArgs } from "react-router-dom";

// Loader for Recipe Details page
const recipeDetailsLoader = async (args: LoaderFunctionArgs) => {
    const { recipeId } = args.params;
    
    if (!recipeId) {
        throw new Response("Recipe ID is required", { status: 400 });
    }

    // Get the request URL to construct the API URL correctly for both server and client
    const url = new URL(args.request.url);
    let authToken: string | null = null;

    // Check if we're running client-side or server-side
    if (typeof window !== "undefined") {
        // Client-side: get token from localStorage/sessionStorage
        authToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    } else {
        // Server-side: get token from cookies or Authorization header
        const cookies = args.request.headers.get("cookie") || "";
        const cookieMatch = cookies.match(/auth_token=([^;]+)/);
        const token = cookieMatch ? cookieMatch[1] : null;

        // If no token in cookie, check Authorization header
        const authHeader = args.request.headers.get("authorization");
        const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

        authToken = token || headerToken;
    }

    // Fetch recipe from API
    const headers: HeadersInit = {};
    
    // Add Authorization header if we have a token
    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    // Only add Cookie header if we're on server-side (cookies are automatically sent client-side)
    if (typeof window === "undefined") {
        const cookies = args.request.headers.get("cookie") || "";
        headers.Cookie = cookies;
    }

    const response = await fetch(`${url.origin}/api/recipes/${encodeURIComponent(recipeId)}`, {
        headers,
        credentials: "include" // Include cookies in client-side requests
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Response("Recipe not found", { status: 404 });
        }
        throw new Response("Failed to load recipe", { status: response.status });
    }

    const data = await response.json();
    const recipe = data.recipe;

    return {
        recipe,
        title: `${recipe.name} - Recipe Database - NoBullFit`,
        meta: [
            { name: "description", content: recipe.description || `View recipe: ${recipe.name}` }
        ]
    };
};

export default recipeDetailsLoader;
