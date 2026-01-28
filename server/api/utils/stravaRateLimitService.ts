// Strava Rate Limit Service
// Tracks API rate limits and provides utilities to avoid hitting limits

// Rate limit state tracking
interface RateLimitState {
    // Overall limits (includes upload endpoints)
    limit15Min: number;
    limitDaily: number;
    usage15Min: number;
    usageDaily: number;
    // Read-only limits (non-upload endpoints)
    readLimit15Min: number;
    readLimitDaily: number;
    readUsage15Min: number;
    readUsageDaily: number;
    // Tracking
    lastUpdated: Date;
    // 15-minute window tracking
    windowStart15Min: Date;
}

// Default limits for new apps
const DEFAULT_LIMITS: RateLimitState = {
    limit15Min: 200,
    limitDaily: 2000,
    usage15Min: 0,
    usageDaily: 0,
    readLimit15Min: 100,
    readLimitDaily: 1000,
    readUsage15Min: 0,
    readUsageDaily: 0,
    lastUpdated: new Date(),
    windowStart15Min: get15MinWindowStart()
};

// Current rate limit state (in-memory, resets on server restart)
let rateLimitState: RateLimitState = { ...DEFAULT_LIMITS };

// Get the start of the current 15-minute window (0, 15, 30, 45)
function get15MinWindowStart(): Date {
    const now = new Date();
    const minutes = now.getMinutes();
    const windowMinutes = Math.floor(minutes / 15) * 15;
    const windowStart = new Date(now);
    windowStart.setMinutes(windowMinutes, 0, 0);
    return windowStart;
}

// Check if we're in a new 15-minute window
function isNew15MinWindow(): boolean {
    const currentWindowStart = get15MinWindowStart();
    return currentWindowStart > rateLimitState.windowStart15Min;
}

// Parse rate limit headers from Strava API response
function parseRateLimitHeader(header: string | null): [number, number] {
    if (!header) return [0, 0];
    const parts = header.split(",").map(s => parseInt(s.trim(), 10));
    return [parts[0] || 0, parts[1] || 0];
}

// Update rate limit state from response headers
export function updateRateLimits(headers: Headers): void {
    // Check if we're in a new 15-minute window
    if (isNew15MinWindow()) {
        rateLimitState.usage15Min = 0;
        rateLimitState.readUsage15Min = 0;
        rateLimitState.windowStart15Min = get15MinWindowStart();
    }

    // Parse overall rate limits
    const limitHeader = headers.get("X-RateLimit-Limit");
    const usageHeader = headers.get("X-RateLimit-Usage");

    if (limitHeader) {
        const [limit15, limitDaily] = parseRateLimitHeader(limitHeader);
        rateLimitState.limit15Min = limit15;
        rateLimitState.limitDaily = limitDaily;
    }

    if (usageHeader) {
        const [usage15, usageDaily] = parseRateLimitHeader(usageHeader);
        rateLimitState.usage15Min = usage15;
        rateLimitState.usageDaily = usageDaily;
    }

    // Parse read-only rate limits
    const readLimitHeader = headers.get("X-ReadRateLimit-Limit");
    const readUsageHeader = headers.get("X-ReadRateLimit-Usage");

    if (readLimitHeader) {
        const [readLimit15, readLimitDaily] = parseRateLimitHeader(readLimitHeader);
        rateLimitState.readLimit15Min = readLimit15;
        rateLimitState.readLimitDaily = readLimitDaily;
    }

    if (readUsageHeader) {
        const [readUsage15, readUsageDaily] = parseRateLimitHeader(readUsageHeader);
        rateLimitState.readUsage15Min = readUsage15;
        rateLimitState.readUsageDaily = readUsageDaily;
    }

    rateLimitState.lastUpdated = new Date();
}

// Check if we can safely make a read request (non-upload)
export function canMakeReadRequest(): boolean {
    // Check if we're in a new window and reset counters
    if (isNew15MinWindow()) {
        rateLimitState.usage15Min = 0;
        rateLimitState.readUsage15Min = 0;
        rateLimitState.windowStart15Min = get15MinWindowStart();
    }

    // Leave 10% buffer to avoid hitting limits
    const buffer15Min = Math.max(1, Math.floor(rateLimitState.readLimit15Min * 0.1));
    const bufferDaily = Math.max(10, Math.floor(rateLimitState.readLimitDaily * 0.1));

    const within15MinLimit = rateLimitState.readUsage15Min < (rateLimitState.readLimit15Min - buffer15Min);
    const withinDailyLimit = rateLimitState.readUsageDaily < (rateLimitState.readLimitDaily - bufferDaily);

    return within15MinLimit && withinDailyLimit;
}

// Check if we can make any request (including upload)
export function canMakeRequest(): boolean {
    // Check if we're in a new window and reset counters
    if (isNew15MinWindow()) {
        rateLimitState.usage15Min = 0;
        rateLimitState.readUsage15Min = 0;
        rateLimitState.windowStart15Min = get15MinWindowStart();
    }

    // Leave 10% buffer
    const buffer15Min = Math.max(1, Math.floor(rateLimitState.limit15Min * 0.1));
    const bufferDaily = Math.max(10, Math.floor(rateLimitState.limitDaily * 0.1));

    const within15MinLimit = rateLimitState.usage15Min < (rateLimitState.limit15Min - buffer15Min);
    const withinDailyLimit = rateLimitState.usageDaily < (rateLimitState.limitDaily - bufferDaily);

    return within15MinLimit && withinDailyLimit;
}

// Get time until 15-minute window resets (in milliseconds)
export function getTimeUntil15MinReset(): number {
    const windowStart = get15MinWindowStart();
    const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);
    return Math.max(0, windowEnd.getTime() - Date.now());
}

// Get time until daily reset (midnight UTC)
export function getTimeUntilDailyReset(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return Math.max(0, tomorrow.getTime() - now.getTime());
}

// Get recommended retry delay (in milliseconds)
export function getRetryAfterMs(): number {
    // If 15-minute limit is close, wait for window reset
    const usage15Percent = rateLimitState.readUsage15Min / rateLimitState.readLimit15Min;
    if (usage15Percent > 0.9) {
        return getTimeUntil15MinReset() + 1000; // Add 1 second buffer
    }

    // If daily limit is close, wait longer
    const usageDailyPercent = rateLimitState.readUsageDaily / rateLimitState.readLimitDaily;
    if (usageDailyPercent > 0.9) {
        // Don't wait for full daily reset, just back off significantly
        return Math.min(getTimeUntilDailyReset(), 30 * 60 * 1000); // Max 30 minutes
    }

    // Default backoff
    return 5000; // 5 seconds
}

// Get current rate limit state for logging/debugging
export function getRateLimitState(): Readonly<RateLimitState> {
    return { ...rateLimitState };
}

// Get usage percentages for monitoring
export function getUsagePercentages(): {
    read15Min: number;
    readDaily: number;
    overall15Min: number;
    overallDaily: number;
} {
    return {
        read15Min: rateLimitState.readLimit15Min > 0
            ? (rateLimitState.readUsage15Min / rateLimitState.readLimit15Min) * 100
            : 0,
        readDaily: rateLimitState.readLimitDaily > 0
            ? (rateLimitState.readUsageDaily / rateLimitState.readLimitDaily) * 100
            : 0,
        overall15Min: rateLimitState.limit15Min > 0
            ? (rateLimitState.usage15Min / rateLimitState.limit15Min) * 100
            : 0,
        overallDaily: rateLimitState.limitDaily > 0
            ? (rateLimitState.usageDaily / rateLimitState.limitDaily) * 100
            : 0
    };
}

// Wrapper for fetch that updates rate limits
export async function stravaFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Check rate limits before making request
    if (!canMakeReadRequest()) {
        const retryAfter = getRetryAfterMs();
        const error = new Error(
            `Rate limit approaching. Retry after ${Math.ceil(retryAfter / 1000)} seconds.`
        );
        (error as Error & { retryAfter: number }).retryAfter = retryAfter;
        throw error;
    }

    const response = await fetch(url, options);

    // Update rate limits from response headers
    updateRateLimits(response.headers);

    // Handle 429 Too Many Requests
    if (response.status === 429) {
        const retryAfter = getRetryAfterMs();
        const error = new Error("Strava rate limit exceeded");
        (error as Error & { retryAfter: number; status: number }).retryAfter = retryAfter;
        (error as Error & { retryAfter: number; status: number }).status = 429;
        throw error;
    }

    return response;
}

// Reset state (for testing purposes)
export function resetRateLimitState(): void {
    rateLimitState = { ...DEFAULT_LIMITS };
}
