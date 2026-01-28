import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    updateRateLimits,
    canMakeReadRequest,
    canMakeRequest,
    getRetryAfterMs,
    getRateLimitState,
    getUsagePercentages,
    stravaFetch,
    resetRateLimitState
} from "./stravaRateLimitService";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("stravaRateLimitService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetRateLimitState();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("updateRateLimits", () => {
        it("should parse overall rate limit headers correctly", () => {
            const headers = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "50,500"
            });

            updateRateLimits(headers);
            const state = getRateLimitState();

            expect(state.limit15Min).toBe(200);
            expect(state.limitDaily).toBe(2000);
            expect(state.usage15Min).toBe(50);
            expect(state.usageDaily).toBe(500);
        });

        it("should parse read rate limit headers correctly", () => {
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "25,250"
            });

            updateRateLimits(headers);
            const state = getRateLimitState();

            expect(state.readLimit15Min).toBe(100);
            expect(state.readLimitDaily).toBe(1000);
            expect(state.readUsage15Min).toBe(25);
            expect(state.readUsageDaily).toBe(250);
        });

        it("should handle missing headers gracefully", () => {
            const headers = new Headers({});

            updateRateLimits(headers);
            const state = getRateLimitState();

            // Should keep default values
            expect(state.limit15Min).toBe(200);
            expect(state.limitDaily).toBe(2000);
        });
    });

    describe("canMakeReadRequest", () => {
        it("should return true when within limits", () => {
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "10,100"
            });

            updateRateLimits(headers);

            expect(canMakeReadRequest()).toBe(true);
        });

        it("should return false when approaching 15-minute limit", () => {
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "95,100" // 95% of 15-min limit
            });

            updateRateLimits(headers);

            expect(canMakeReadRequest()).toBe(false);
        });

        it("should return false when approaching daily limit", () => {
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "10,950" // 95% of daily limit
            });

            updateRateLimits(headers);

            expect(canMakeReadRequest()).toBe(false);
        });
    });

    describe("canMakeRequest", () => {
        it("should return true when within overall limits", () => {
            const headers = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "20,200"
            });

            updateRateLimits(headers);

            expect(canMakeRequest()).toBe(true);
        });

        it("should return false when approaching overall 15-minute limit", () => {
            const headers = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "190,200" // 95% of 15-min limit
            });

            updateRateLimits(headers);

            expect(canMakeRequest()).toBe(false);
        });
    });

    describe("getUsagePercentages", () => {
        it("should calculate usage percentages correctly", () => {
            const headers = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "100,1000",
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "50,500"
            });

            updateRateLimits(headers);
            const percentages = getUsagePercentages();

            expect(percentages.overall15Min).toBe(50);
            expect(percentages.overallDaily).toBe(50);
            expect(percentages.read15Min).toBe(50);
            expect(percentages.readDaily).toBe(50);
        });
    });

    describe("getRetryAfterMs", () => {
        it("should return a positive value when rate limited", () => {
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "95,100"
            });

            updateRateLimits(headers);
            const retryAfter = getRetryAfterMs();

            expect(retryAfter).toBeGreaterThan(0);
        });

        it("should return default backoff when not rate limited", () => {
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "10,100"
            });

            updateRateLimits(headers);
            const retryAfter = getRetryAfterMs();

            expect(retryAfter).toBe(5000); // Default 5 second backoff
        });
    });

    describe("stravaFetch", () => {
        it("should make request and update rate limits on success", async () => {
            const mockHeaders = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "10,100"
            });

            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                headers: mockHeaders
            });

            const response = await stravaFetch("https://www.strava.com/api/v3/athlete");

            expect(response.ok).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                "https://www.strava.com/api/v3/athlete",
                {}
            );
        });

        it("should throw error when rate limit approaching", async () => {
            // Set up high usage to trigger rate limit check
            const headers = new Headers({
                "X-ReadRateLimit-Limit": "100,1000",
                "X-ReadRateLimit-Usage": "95,100"
            });

            updateRateLimits(headers);

            await expect(stravaFetch("https://www.strava.com/api/v3/athlete"))
                .rejects
                .toThrow(/Rate limit approaching/);
        });

        it("should throw error with retryAfter on 429 response", async () => {
            const mockHeaders = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "200,2000"
            });

            mockFetch.mockResolvedValue({
                ok: false,
                status: 429,
                headers: mockHeaders
            });

            try {
                await stravaFetch("https://www.strava.com/api/v3/athlete");
                expect.fail("Should have thrown an error");
            } catch (error) {
                expect((error as Error).message).toBe("Strava rate limit exceeded");
                expect((error as Error & { status: number }).status).toBe(429);
            }
        });

        it("should pass through request options", async () => {
            const mockHeaders = new Headers({
                "X-RateLimit-Limit": "200,2000",
                "X-RateLimit-Usage": "10,100"
            });

            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                headers: mockHeaders
            });

            const options = {
                headers: { Authorization: "Bearer token123" }
            };

            await stravaFetch("https://www.strava.com/api/v3/athlete", options);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://www.strava.com/api/v3/athlete",
                options
            );
        });
    });
});
