import { google } from "googleapis";

interface QueryResult {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface PageResult {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface OverallResult {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface DeviceResult {
    device: string;
    clicks: number;
    impressions: number;
}

// Check if Search Console credentials are configured
function isConfigured(): boolean {
    return !!(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
    );
}

// Create authenticated webmasters client
function getClient() {
    const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });

    return google.webmasters({ version: "v3", auth });
}

// Get top search queries by clicks
export async function getTopQueries(startDate: string, endDate: string, limit: number = 20): Promise<QueryResult[] | null> {
    if (!isConfigured()) return null;

    try {
        const webmasters = getClient();
        const response = await webmasters.searchanalytics.query({
            siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL!,
            requestBody: {
                startDate,
                endDate,
                dimensions: ["query"],
                rowLimit: limit,
            },
        });

        return (response.data.rows || []).map((row) => ({
            query: row.keys?.[0] || "",
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
        }));
    } catch (error) {
        console.error("[SearchConsole] Failed to fetch top queries:", error);
        return null;
    }
}

// Get top pages by clicks
export async function getTopPages(startDate: string, endDate: string, limit: number = 20): Promise<PageResult[] | null> {
    if (!isConfigured()) return null;

    try {
        const webmasters = getClient();
        const response = await webmasters.searchanalytics.query({
            siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL!,
            requestBody: {
                startDate,
                endDate,
                dimensions: ["page"],
                rowLimit: limit,
            },
        });

        return (response.data.rows || []).map((row) => ({
            page: row.keys?.[0] || "",
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
        }));
    } catch (error) {
        console.error("[SearchConsole] Failed to fetch top pages:", error);
        return null;
    }
}

// Get overall performance (aggregate clicks, impressions, ctr, position)
export async function getOverallPerformance(startDate: string, endDate: string): Promise<OverallResult | null> {
    if (!isConfigured()) return null;

    try {
        const webmasters = getClient();
        const response = await webmasters.searchanalytics.query({
            siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL!,
            requestBody: {
                startDate,
                endDate,
            },
        });

        const rows = response.data.rows || [];
        if (rows.length === 0) {
            return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
        }

        // Without dimensions, the API returns a single aggregated row
        const row = rows[0];
        return {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
        };
    } catch (error) {
        console.error("[SearchConsole] Failed to fetch overall performance:", error);
        return null;
    }
}

// Get clicks/impressions breakdown by device type
export async function getDeviceBreakdown(startDate: string, endDate: string): Promise<DeviceResult[] | null> {
    if (!isConfigured()) return null;

    try {
        const webmasters = getClient();
        const response = await webmasters.searchanalytics.query({
            siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL!,
            requestBody: {
                startDate,
                endDate,
                dimensions: ["device"],
            },
        });

        return (response.data.rows || []).map((row) => ({
            device: row.keys?.[0] || "",
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
        }));
    } catch (error) {
        console.error("[SearchConsole] Failed to fetch device breakdown:", error);
        return null;
    }
}
