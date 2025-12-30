import type { LoaderFunctionArgs } from "react-router-dom";
import dashboardLoader from "./dashboardLoader";
import { generateSEOTags } from "@utils/seo";

// Loader for TDEE page - requires authentication
const tdeeLoader = async (args: LoaderFunctionArgs) => {
    const data = await dashboardLoader(args);
    
    const url = new URL(args.request.url);
    
    let hasWeight = false;
    let weightData = null;
    let tdeeData = null;
    
    try {
        // Get auth token
        let authToken: string | null = null;
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

        const headers: HeadersInit = {};
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }
        if (typeof window === "undefined") {
            const cookies = args.request.headers.get("cookie") || "";
            headers.Cookie = cookies;
        }

        // Get latest weight
        const weightResponse = await fetch(`${url.origin}/api/tdee/latest-weight`, {
            headers,
            credentials: "include"
        });
        
        if (weightResponse.ok) {
            const weightResult = await weightResponse.json();
            if (weightResult.weight) {
                hasWeight = true;
                weightData = weightResult.weight;
            }
        }

        // Get TDEE data if exists
        const tdeeResponse = await fetch(`${url.origin}/api/tdee`, {
            headers,
            credentials: "include"
        });
        
        if (tdeeResponse.ok) {
            const tdeeResult = await tdeeResponse.json();
            if (tdeeResult.tdee) {
                tdeeData = tdeeResult.tdee;
            }
        }
    } catch (error) {
        console.error("Error loading TDEE data:", error);
    }
    
    return {
        ...data,
        title: "TDEE Calculator - NoBullFit",
        meta: generateSEOTags({
            title: "TDEE Calculator",
            description: "Calculate your Total Daily Energy Expenditure (TDEE) to understand how many calories you burn daily and optimize your nutrition plan.",
            path: "/dashboard/tdee",
            noIndex: true
        }),
        hasWeight,
        weightData,
        tdeeData
    };
};

export default tdeeLoader;
