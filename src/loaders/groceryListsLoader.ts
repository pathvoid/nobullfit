import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Grocery Lists page - requires authentication
const groceryListsLoader = async (args: LoaderFunctionArgs) => {
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
            title: "Grocery Lists",
            description: "Create and manage your grocery lists. Organize your shopping with easy-to-use lists.",
            path: "/dashboard/grocery-lists",
            noIndex: true
        });

        if (!authToken) {
            return {
                ...data,
                title: "Grocery Lists - NoBullFit",
                meta: seoMeta,
                lists: [],
                error: "Authentication required"
            };
        }

        // Fetch grocery lists from API
        const headers: HeadersInit = {
            Authorization: `Bearer ${authToken}`
        };

        // Only add Cookie header if we're on server-side (cookies are automatically sent client-side)
        if (typeof window === "undefined") {
            const cookies = args.request.headers.get("cookie") || "";
            headers.Cookie = cookies;
        }

        const response = await fetch(`${url.origin}/api/grocery-lists`, {
            headers,
            credentials: "include"
        });

        if (!response.ok) {
            return {
                ...data,
                title: "Grocery Lists - NoBullFit",
                meta: seoMeta,
                lists: [],
                error: "Failed to load grocery lists"
            };
        }

        const listsData = await response.json();

        return {
            ...data,
            title: "Grocery Lists - NoBullFit",
            meta: seoMeta,
            lists: listsData.lists || []
        };
    } catch (error) {
        console.error("Error loading grocery lists:", error);
        return {
            ...data,
            title: "Grocery Lists - NoBullFit",
            meta: generateSEOTags({
                title: "Grocery Lists",
                description: "Create and manage your grocery lists.",
                path: "/dashboard/grocery-lists",
                noIndex: true
            }),
            lists: [],
            error: "Failed to load grocery lists"
        };
    }
};

export default groceryListsLoader;
