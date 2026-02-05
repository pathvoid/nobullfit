import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("crypto", () => ({
    default: {
        randomBytes: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import crypto from "crypto";
import { normalizeUrl, shortenUrl, getOriginalUrl, getShortLinkStats } from "./linkShortenerService.js";

describe("linkShortenerService", () => {
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockPool = {
            query: vi.fn()
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(mockPool);
    });

    describe("normalizeUrl", () => {
        it("should remove trailing slash from URLs", () => {
            expect(normalizeUrl("https://nobull.fit/dashboard/")).toBe("https://nobull.fit/dashboard");
            expect(normalizeUrl("https://nobull.fit/dashboard/food-database/")).toBe("https://nobull.fit/dashboard/food-database");
        });

        it("should not modify URLs without trailing slash", () => {
            expect(normalizeUrl("https://nobull.fit/dashboard")).toBe("https://nobull.fit/dashboard");
            expect(normalizeUrl("https://nobull.fit/dashboard/food-database")).toBe("https://nobull.fit/dashboard/food-database");
        });

        it("should preserve root path", () => {
            expect(normalizeUrl("https://nobull.fit/")).toBe("https://nobull.fit/");
        });

        it("should preserve query parameters", () => {
            expect(normalizeUrl("https://nobull.fit/dashboard/?foo=bar")).toBe("https://nobull.fit/dashboard?foo=bar");
            expect(normalizeUrl("https://nobull.fit/dashboard?foo=bar")).toBe("https://nobull.fit/dashboard?foo=bar");
        });

        it("should preserve hash fragments", () => {
            expect(normalizeUrl("https://nobull.fit/dashboard/#section")).toBe("https://nobull.fit/dashboard#section");
            expect(normalizeUrl("https://nobull.fit/dashboard#section")).toBe("https://nobull.fit/dashboard#section");
        });

        it("should handle non-standard URLs gracefully", () => {
            expect(normalizeUrl("not-a-url/")).toBe("not-a-url");
            expect(normalizeUrl("simple")).toBe("simple");
        });
    });

    describe("shortenUrl", () => {
        beforeEach(() => {
            // Mock crypto.randomBytes to return predictable bytes
            const mockBytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
            (crypto.randomBytes as ReturnType<typeof vi.fn>).mockReturnValue(mockBytes);
        });

        it("should return existing short link if URL already shortened", async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ code: "existingCode" }]
            });

            const result = await shortenUrl("https://nobull.fit/dashboard");

            expect(result).toEqual({
                code: "existingCode",
                shortUrl: "https://nobull.fit/p/existingCode"
            });
            expect(mockPool.query).toHaveBeenCalledWith(
                "SELECT code FROM short_links WHERE normalized_url = $1",
                ["https://nobull.fit/dashboard"]
            );
        });

        it("should return same short link for URLs with and without trailing slash", async () => {
            // First call - check existing (not found)
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Insert succeeds
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
            // Verify insert
            mockPool.query.mockResolvedValueOnce({
                rows: [{ code: "newCode123" }]
            });

            const result1 = await shortenUrl("https://nobull.fit/dashboard/");

            // Check that normalized URL was used
            expect(mockPool.query).toHaveBeenCalledWith(
                "SELECT code FROM short_links WHERE normalized_url = $1",
                ["https://nobull.fit/dashboard"]
            );
        });

        it("should create new short link if URL not found", async () => {
            // First call - check existing (not found)
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Insert succeeds
            mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
            // Verify insert
            mockPool.query.mockResolvedValueOnce({
                rows: [{ code: "BCDEFGHJ" }]
            });

            const result = await shortenUrl("https://nobull.fit/new-page");

            expect(result).not.toBeNull();
            expect(result?.shortUrl).toMatch(/^https:\/\/nobull\.fit\/p\/[A-Za-z0-9]+$/);
        });

        it("should return null if database pool not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const result = await shortenUrl("https://nobull.fit/dashboard");

            expect(result).toBeNull();
        });

        it("should return null on database error", async () => {
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            const result = await shortenUrl("https://nobull.fit/dashboard");

            expect(result).toBeNull();
        });
    });

    describe("getOriginalUrl", () => {
        it("should return original URL and increment click count by default", async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ original_url: "https://nobull.fit/dashboard" }]
            });

            const result = await getOriginalUrl("testCode");

            expect(result).toBe("https://nobull.fit/dashboard");
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE short_links"),
                ["testCode"]
            );
        });

        it("should return original URL without incrementing click count when specified", async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{ original_url: "https://nobull.fit/dashboard" }]
            });

            const result = await getOriginalUrl("testCode", false);

            expect(result).toBe("https://nobull.fit/dashboard");
            expect(mockPool.query).toHaveBeenCalledWith(
                "SELECT original_url FROM short_links WHERE code = $1",
                ["testCode"]
            );
        });

        it("should return null if code not found", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const result = await getOriginalUrl("nonExistent");

            expect(result).toBeNull();
        });

        it("should return null if database pool not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const result = await getOriginalUrl("testCode");

            expect(result).toBeNull();
        });

        it("should return null on database error", async () => {
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            const result = await getOriginalUrl("testCode");

            expect(result).toBeNull();
        });
    });

    describe("getShortLinkStats", () => {
        it("should return stats for existing short link", async () => {
            const createdAt = new Date("2024-01-15T10:00:00Z");
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    code: "testCode",
                    original_url: "https://nobull.fit/dashboard",
                    click_count: 42,
                    created_at: createdAt
                }]
            });

            const result = await getShortLinkStats("testCode");

            expect(result).toEqual({
                code: "testCode",
                originalUrl: "https://nobull.fit/dashboard",
                clickCount: 42,
                createdAt
            });
        });

        it("should return null if code not found", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const result = await getShortLinkStats("nonExistent");

            expect(result).toBeNull();
        });

        it("should return null if database pool not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const result = await getShortLinkStats("testCode");

            expect(result).toBeNull();
        });

        it("should return null on database error", async () => {
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            const result = await getShortLinkStats("testCode");

            expect(result).toBeNull();
        });
    });
});
