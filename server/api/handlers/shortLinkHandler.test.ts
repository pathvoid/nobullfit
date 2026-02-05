import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleShortLinkRedirect } from "./shortLinkHandler.js";

// Mock dependencies
vi.mock("../utils/linkShortenerService", () => ({
    getOriginalUrl: vi.fn()
}));

import { getOriginalUrl } from "../utils/linkShortenerService.js";

describe("shortLinkHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            params: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            redirect: vi.fn().mockReturnThis()
        };
    });

    it("should redirect to original URL when valid code is provided", async () => {
        mockRequest.params = { code: "testCode" };
        (getOriginalUrl as ReturnType<typeof vi.fn>).mockResolvedValue("https://nobull.fit/dashboard");

        await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

        expect(getOriginalUrl).toHaveBeenCalledWith("testCode");
        expect(mockResponse.redirect).toHaveBeenCalledWith(302, "https://nobull.fit/dashboard");
    });

    it("should return 400 if code is missing", async () => {
        mockRequest.params = {};

        await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid short link code" });
    });

    it("should return 400 if code has invalid format", async () => {
        mockRequest.params = { code: "invalid!@#$" };

        await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid short link format" });
    });

    it("should return 400 if code is too long", async () => {
        mockRequest.params = { code: "a".repeat(25) };

        await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid short link format" });
    });

    it("should return 404 if short link not found", async () => {
        mockRequest.params = { code: "nonExistent" };
        (getOriginalUrl as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Short link not found" });
    });

    it("should return 500 on unexpected error", async () => {
        mockRequest.params = { code: "testCode" };
        (getOriginalUrl as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected error"));

        await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
    });

    it("should accept alphanumeric codes of various lengths", async () => {
        const validCodes = ["a", "ABC123", "testCode12", "z9A"];

        for (const code of validCodes) {
            mockRequest.params = { code };
            (getOriginalUrl as ReturnType<typeof vi.fn>).mockResolvedValue("https://nobull.fit/test");

            await handleShortLinkRedirect(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.redirect).toHaveBeenCalledWith(302, "https://nobull.fit/test");
        }
    });
});
