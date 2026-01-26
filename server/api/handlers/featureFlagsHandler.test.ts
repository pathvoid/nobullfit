import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleGetFeatureFlags,
    handleGetEnabledFlags,
    handleGetIntegrationFlags,
    handleGetEnabledIntegrations
} from "./featureFlagsHandler";

// Mock dependencies
vi.mock("../utils/featureFlagService", () => ({
    getAllFlags: vi.fn(),
    getEnabledFlags: vi.fn(),
    getIntegrationFlags: vi.fn(),
    getEnabledIntegrationProviders: vi.fn()
}));

import {
    getAllFlags,
    getEnabledFlags,
    getIntegrationFlags,
    getEnabledIntegrationProviders
} from "../utils/featureFlagService.js";

describe("featureFlagsHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockSetHeader: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSetHeader = vi.fn();
        mockRequest = {};
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: mockSetHeader
        };
    });

    describe("handleGetFeatureFlags", () => {
        it("should return all feature flags", async () => {
            const mockFlags = [
                {
                    flag_key: "dark_mode",
                    flag_name: "Dark Mode",
                    description: "Enable dark mode",
                    is_enabled: true
                },
                {
                    flag_key: "new_dashboard",
                    flag_name: "New Dashboard",
                    description: "Show new dashboard",
                    is_enabled: false
                }
            ];

            (getAllFlags as ReturnType<typeof vi.fn>).mockResolvedValue(mockFlags);

            await handleGetFeatureFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                flags: [
                    { key: "dark_mode", name: "Dark Mode", description: "Enable dark mode", enabled: true },
                    { key: "new_dashboard", name: "New Dashboard", description: "Show new dashboard", enabled: false }
                ]
            });
        });

        it("should return empty array when no flags exist", async () => {
            (getAllFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await handleGetFeatureFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ flags: [] });
        });

        it("should return 500 on error", async () => {
            (getAllFlags as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));

            await handleGetFeatureFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });
    });

    describe("handleGetEnabledFlags", () => {
        it("should return enabled flag keys", async () => {
            const mockFlags = [
                { flag_key: "dark_mode" },
                { flag_key: "beta_features" }
            ];

            (getEnabledFlags as ReturnType<typeof vi.fn>).mockResolvedValue(mockFlags);

            await handleGetEnabledFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                enabledFlags: ["dark_mode", "beta_features"]
            });
        });

        it("should return empty array when no flags are enabled", async () => {
            (getEnabledFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await handleGetEnabledFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ enabledFlags: [] });
        });

        it("should return 500 on error", async () => {
            (getEnabledFlags as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));

            await handleGetEnabledFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });
    });

    describe("handleGetIntegrationFlags", () => {
        it("should return integration flags with provider extracted", async () => {
            const mockFlags = [
                {
                    flag_key: "integration_strava",
                    flag_name: "Strava Integration",
                    description: "Enable Strava sync",
                    is_enabled: true
                },
                {
                    flag_key: "integration_fitbit",
                    flag_name: "Fitbit Integration",
                    description: "Enable Fitbit sync",
                    is_enabled: false
                }
            ];

            (getIntegrationFlags as ReturnType<typeof vi.fn>).mockResolvedValue(mockFlags);

            await handleGetIntegrationFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                integrations: [
                    {
                        key: "integration_strava",
                        provider: "strava",
                        name: "Strava Integration",
                        description: "Enable Strava sync",
                        enabled: true
                    },
                    {
                        key: "integration_fitbit",
                        provider: "fitbit",
                        name: "Fitbit Integration",
                        description: "Enable Fitbit sync",
                        enabled: false
                    }
                ]
            });
        });

        it("should return empty array when no integration flags exist", async () => {
            (getIntegrationFlags as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await handleGetIntegrationFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ integrations: [] });
        });

        it("should return 500 on error", async () => {
            (getIntegrationFlags as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));

            await handleGetIntegrationFlags(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });
    });

    describe("handleGetEnabledIntegrations", () => {
        it("should return enabled integration provider keys", async () => {
            const mockProviders = ["strava", "garmin"];

            (getEnabledIntegrationProviders as ReturnType<typeof vi.fn>).mockResolvedValue(mockProviders);

            await handleGetEnabledIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                enabledProviders: ["strava", "garmin"]
            });
        });

        it("should return empty array when no integrations are enabled", async () => {
            (getEnabledIntegrationProviders as ReturnType<typeof vi.fn>).mockResolvedValue([]);

            await handleGetEnabledIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ enabledProviders: [] });
        });

        it("should return 500 on error", async () => {
            (getEnabledIntegrationProviders as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database error"));

            await handleGetEnabledIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });
    });
});
