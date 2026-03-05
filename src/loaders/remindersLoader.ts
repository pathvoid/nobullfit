import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for Reminders page - requires authentication
const remindersLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);

    try {
        const url = new URL(args.request.url);
        let authToken: string | null = null;

        // Check if we're running client-side or server-side
        if (typeof window !== "undefined") {
            authToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
        } else {
            const cookies = args.request.headers.get("cookie") || "";
            const cookieMatch = cookies.match(/auth_token=([^;]+)/);
            const token = cookieMatch ? cookieMatch[1] : null;

            const authHeader = args.request.headers.get("authorization");
            const headerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

            authToken = token || headerToken;
        }

        const seoMeta = generateSEOTags({
            title: "Reminders",
            description: "Set custom reminders for your fitness goals. Get notified via email or SMS.",
            path: "/dashboard/reminders",
            noIndex: true
        });

        if (!authToken) {
            return {
                ...data,
                title: "Reminders - NoBullFit",
                meta: seoMeta,
                reminders: [],
                isGated: false,
                daysLogged: 0,
                isPro: false,
                phoneVerified: false,
                phoneNumber: null,
                error: "Authentication required"
            };
        }

        const headers: HeadersInit = {
            Authorization: `Bearer ${authToken}`
        };

        // Only add Cookie header if we're on server-side
        if (typeof window === "undefined") {
            const cookies = args.request.headers.get("cookie") || "";
            headers.Cookie = cookies;
        }

        const response = await fetch(`${url.origin}/api/reminders`, {
            headers,
            credentials: "include"
        });

        if (!response.ok) {
            return {
                ...data,
                title: "Reminders - NoBullFit",
                meta: seoMeta,
                reminders: [],
                isGated: false,
                daysLogged: 0,
                isPro: false,
                phoneVerified: false,
                phoneNumber: null,
                error: "Failed to load reminders"
            };
        }

        const remindersData = await response.json();

        return {
            ...data,
            title: "Reminders - NoBullFit",
            meta: seoMeta,
            reminders: remindersData.reminders || [],
            isGated: remindersData.isGated || false,
            isPro: remindersData.isPro || false,
            daysLogged: remindersData.daysLogged || 0,
            phoneVerified: remindersData.phoneVerified || false,
            phoneNumber: remindersData.phoneNumber || null
        };
    } catch (error) {
        console.error("Error loading reminders:", error);
        return {
            ...data,
            title: "Reminders - NoBullFit",
            meta: generateSEOTags({
                title: "Reminders",
                description: "Set custom reminders for your fitness goals.",
                path: "/dashboard/reminders",
                noIndex: true
            }),
            reminders: [],
            isGated: false,
            daysLogged: 0,
            phoneVerified: false,
            phoneNumber: null,
            error: "Failed to load reminders"
        };
    }
};

export default remindersLoader;
