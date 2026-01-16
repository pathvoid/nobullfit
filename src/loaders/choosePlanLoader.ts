import { redirect } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import { generateSEOTags } from "@utils/seo";

// Loader for Choose Plan page - requires authentication, redirects if plan already selected
const choosePlanLoader = async ({ request }: LoaderFunctionArgs) => {
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
        throw redirect("/sign-in");
    }

    // Verify token with server and check if plan is already selected
    try {
        const headers: HeadersInit = {
            Authorization: `Bearer ${authToken}`
        };

        // Only add Cookie header if we're on server-side
        if (typeof window === "undefined") {
            const cookies = request.headers.get("cookie") || "";
            headers.Cookie = cookies;
        }

        const response = await fetch(`${url.origin}/api/auth/me`, {
            headers,
            credentials: "include"
        });

        if (!response.ok) {
            // Token invalid or expired, redirect to sign-in
            throw redirect("/sign-in");
        }

        const data = await response.json();
        if (!data.user) {
            throw redirect("/sign-in");
        }

        // If user already has a plan, redirect to dashboard
        if (data.user.plan) {
            throw redirect("/dashboard");
        }

        // User is authenticated but has no plan, show the choose plan page
        return {
            title: "Choose Your Plan - NoBullFit",
            meta: generateSEOTags({
                title: "Choose Your Plan",
                description: "Select your NoBullFit plan. All core features are free forever. Pro features are optional quality-of-life improvements.",
                path: "/choose-plan",
                noIndex: true
            }),
            user: data.user
        };
    } catch (error) {
        // If it's a redirect, re-throw it
        if (error instanceof Response && error.status >= 300 && error.status < 400) {
            throw error;
        }
        // Other errors - redirect to sign-in
        throw redirect("/sign-in");
    }
};

export default choosePlanLoader;
