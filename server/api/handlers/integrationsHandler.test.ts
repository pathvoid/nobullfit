import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetIntegrations, handleDisconnectIntegration } from "./integrationsHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn(),
    generateToken: vi.fn()
}));

vi.mock("../utils/featureFlagService", () => ({
    isIntegrationEnabled: vi.fn()
}));

vi.mock("../utils/integrationProviders", () => ({
    getAllProviderConfigs: vi.fn(),
    getProviderConfig: vi.fn(),
    isValidProvider: vi.fn()
}));

import getPool from "../../db/connection";
import { verifyToken } from "../utils/jwt";
import { isIntegrationEnabled } from "../utils/featureFlagService";
import { getAllProviderConfigs, isValidProvider } from "../utils/integrationProviders";

describe("integrationsHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

    // Strava-only provider config
    const mockProviderConfigs = [
        {
            providerKey: "strava",
            providerName: "Strava",
            description: "Import your running, cycling, and other workouts from Strava",
            category: "workout",
            logoUrl: "/images/integrations/strava.svg",
            supportedDataTypes: ["workouts", "calories_burned"],
            mobileOnly: false
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        mockPool = {
            query: vi.fn()
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(mockPool);

        mockRequest = {
            body: {},
            headers: {},
            cookies: {},
            params: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn().mockReturnThis()
        };
    });

    describe("handleGetIntegrations", () => {
        it("should return 401 if user is not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return integrations for authenticated user", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            (getAllProviderConfigs as ReturnType<typeof vi.fn>).mockReturnValue(mockProviderConfigs);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

            // Mock no existing connections
            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    integrations: expect.any(Array),
                    grouped: expect.objectContaining({
                        wearable: expect.any(Array),
                        workout: expect.any(Array),
                        scale: expect.any(Array)
                    }),
                    anyEnabled: true
                })
            );
        });

        it("should show connected status for existing connections", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            (getAllProviderConfigs as ReturnType<typeof vi.fn>).mockReturnValue([mockProviderConfigs[0]]);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

            // Mock existing connection
            mockPool.query.mockResolvedValue({
                rows: [{
                    provider: "strava",
                    status: "active",
                    last_sync_at: new Date(),
                    last_successful_sync_at: new Date(),
                    provider_user_id: "12345"
                }]
            });

            await handleGetIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(response.integrations[0].isConnected).toBe(true);
            expect(response.integrations[0].connectionStatus).toBe("active");
        });

        it("should return anyEnabled: false when all integrations are disabled", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            (getAllProviderConfigs as ReturnType<typeof vi.fn>).mockReturnValue(mockProviderConfigs);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(false);

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleGetIntegrations(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            const response = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(response.anyEnabled).toBe(false);
        });
    });

    describe("handleDisconnectIntegration", () => {
        it("should return 401 if user is not authenticated", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
            mockRequest.params = { provider: "strava" };

            await handleDisconnectIntegration(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 for invalid provider", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "invalid_provider" };

            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(false);

            await handleDisconnectIntegration(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid provider" });
        });

        it("should disconnect integration successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);

            mockPool.query
                .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }) // Delete connection
                .mockResolvedValueOnce({ rowCount: 0 }); // Delete auto-sync settings

            await handleDisconnectIntegration(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Integration disconnected"
            });
        });

        it("should return 404 if connection not found", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);

            mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

            await handleDisconnectIntegration(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Connection not found" });
        });
    });
});
