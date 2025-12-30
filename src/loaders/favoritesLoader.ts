import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Favorites page - requires authentication
const favoritesLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    
    try {
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

        const seoMeta = generateSEOTags({
            title: "Favorites",
            description: "View and manage your favorite recipes and foods. Quick access to your most-loved items.",
            path: "/dashboard/favorites",
            noIndex: true
        });

        if (!authToken) {
            return {
                ...data,
                title: "Favorites - NoBullFit",
                meta: seoMeta,
                favorites: [],
                error: "Authentication required"
            };
        }

        // Fetch favorites from API
        const headers: HeadersInit = {
            Authorization: `Bearer ${authToken}`
        };

        // Only add Cookie header if we're on server-side (cookies are automatically sent client-side)
        if (typeof window === "undefined") {
            const cookies = args.request.headers.get("cookie") || "";
            headers.Cookie = cookies;
        }

        const response = await fetch(`${url.origin}/api/favorites`, {
            headers,
            credentials: "include"
        });

        if (!response.ok) {
            return {
                ...data,
                title: "Favorites - NoBullFit",
                meta: seoMeta,
                favorites: [],
                error: "Failed to load favorites"
            };
        }

        const favoritesData = await response.json();

        return {
            ...data,
            title: "Favorites - NoBullFit",
            meta: seoMeta,
            favorites: favoritesData.favorites || []
        };
    } catch (error) {
        console.error("Error loading favorites:", error);
        return {
            ...data,
            title: "Favorites - NoBullFit",
            meta: generateSEOTags({
                title: "Favorites",
                description: "View and manage your favorite recipes and foods.",
                path: "/dashboard/favorites",
                noIndex: true
            }),
            favorites: [],
            error: "Failed to load favorites"
        };
    }
};

export default favoritesLoader;
