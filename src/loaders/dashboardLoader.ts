import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for Dashboard page - requires authentication
const dashboardLoader = async ({ request }: LoaderFunctionArgs) => {
    const url = new URL(request.url);
    let authToken: string | null = null;

    // Check if we're running client-side or server-side
    if (typeof window !== "undefined") {
        // Client-side: get token from localStorage/sessionStorage
        authToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    } else {
        // Server-side: get token from cookies or Authorization header
        const cookies = request.headers.get("cookie") || "";
        const cookieMatch = cookies.match(/auth_token=([^;]+)/);
        const token = cookieMatch ? cookieMatch[1] : null;

        // If no token in cookie, check Authorization header
        const authHeader = request.headers.get("authorization");
        const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

        authToken = token || headerToken;
    }

    // If no token found, redirect to sign-in
    if (!authToken) {
        const signInUrl = new URL("/sign-in", url.origin);
        signInUrl.searchParams.set("redirect", url.pathname);
        throw redirect(signInUrl.toString());
    }

    // Verify token with server
    try {
        const headers: HeadersInit = {
            Authorization: `Bearer ${authToken}`
        };

        // Only add Cookie header if we're on server-side (cookies are automatically sent client-side)
        if (typeof window === "undefined") {
            const cookies = request.headers.get("cookie") || "";
            headers.Cookie = cookies;
        }

        const response = await fetch(`${url.origin}/api/auth/me`, {
            headers,
            credentials: "include" // Include cookies in client-side requests
        });

        if (!response.ok) {
            // Token invalid or expired, redirect to sign-in
            const signInUrl = new URL("/sign-in", url.origin);
            signInUrl.searchParams.set("redirect", url.pathname);
            throw redirect(signInUrl.toString());
        }

        const data = await response.json();
        if (!data.user) {
            // Invalid response, redirect to sign-in
            const signInUrl = new URL("/sign-in", url.origin);
            signInUrl.searchParams.set("redirect", url.pathname);
            throw redirect(signInUrl.toString());
        }

        // Fetch dashboard stats
        let stats = null;
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const statsResponse = await fetch(`${url.origin}/api/dashboard/stats?period=week&timezone=${encodeURIComponent(userTimezone)}`, {
                headers,
                credentials: "include"
            });
            
            if (statsResponse.ok) {
                stats = await statsResponse.json();
            }
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            // Continue without stats - not critical
        }

        // User is authenticated, return loader data
        return {
            title: "Dashboard - NoBullFit",
            meta: generateSEOTags({
                title: "Dashboard",
                description: "Your personal NoBullFit dashboard. Track your nutrition, manage recipes, and monitor your fitness progress.",
                path: "/dashboard",
                noIndex: true
            }),
            user: data.user,
            stats
        };
    } catch (error) {
        // If it's a redirect, re-throw it
        if (error instanceof Response && error.status >= 300 && error.status < 400) {
            throw error;
        }
        // Other errors - redirect to sign-in
        const signInUrl = new URL("/sign-in", url.origin);
        signInUrl.searchParams.set("redirect", url.pathname);
        throw redirect(signInUrl.toString());
    }
};

export default dashboardLoader;
