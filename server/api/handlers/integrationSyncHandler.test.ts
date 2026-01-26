import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleTriggerSync,
    handleGetSyncHistory,
    handleGetAutoSyncSettings,
    handleUpdateAutoSyncSettings,
    handleEnableAutoSync,
    handleDisableAutoSync
} from "./integrationSyncHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/featureFlagService", () => ({
    isIntegrationEnabled: vi.fn()
}));

vi.mock("../utils/integrationProviders/index", () => ({
    isValidProvider: vi.fn(),
    getProviderConfig: vi.fn()
}));

vi.mock("../utils/encryptionService", () => ({
    decryptToken: vi.fn(),
    encryptToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { isIntegrationEnabled } from "../utils/featureFlagService.js";
import { isValidProvider, getProviderConfig } from "../utils/integrationProviders/index.js";

describe("integrationSyncHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

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
            params: {},
            query: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    describe("handleTriggerSync", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleTriggerSync(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 for invalid provider", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "invalid_provider" };

            await handleTriggerSync(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid provider" });
        });

        it("should return 403 if integration is not enabled", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(false);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            await handleTriggerSync(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "This integration is currently not available"
            });
        });

        it("should return 500 if database connection fails", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            await handleTriggerSync(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available"
            });
        });

        it("should return 404 if integration not connected", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            mockPool.query.mockResolvedValue({ rows: [] });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            await handleTriggerSync(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Integration not connected" });
        });

        it("should return 400 if integration connection is not active", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            mockPool.query.mockResolvedValue({
                rows: [{ id: 1, status: "disconnected" }]
            });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            await handleTriggerSync(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Integration connection is not active",
                status: "disconnected"
            });
        });
    });

    describe("handleGetSyncHistory", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetSyncHistory(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 400 for invalid provider", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "invalid" };

            await handleGetSyncHistory(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid provider" });
        });

        it("should return sync history with pagination", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);

            const mockHistory = [
                {
                    id: 1,
                    sync_type: "manual",
                    status: "success",
                    records_imported: 5,
                    data_types_synced: ["workouts"],
                    error_message: null,
                    error_code: null,
                    started_at: new Date("2024-01-01T10:00:00Z"),
                    completed_at: new Date("2024-01-01T10:01:00Z"),
                    duration_ms: 60000
                }
            ];

            mockPool.query
                .mockResolvedValueOnce({ rows: mockHistory })
                .mockResolvedValueOnce({ rows: [{ count: "1" }] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.query = { limit: "10", offset: "0" };

            await handleGetSyncHistory(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                history: [{
                    id: 1,
                    syncType: "manual",
                    status: "success",
                    recordsImported: 5,
                    dataTypesSynced: ["workouts"],
                    errorMessage: null,
                    errorCode: null,
                    startedAt: "2024-01-01T10:00:00.000Z",
                    completedAt: "2024-01-01T10:01:00.000Z",
                    durationMs: 60000
                }],
                total: 1,
                limit: 10,
                offset: 0
            });
        });

        it("should cap limit at 100", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            mockPool.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: "0" }] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.query = { limit: "500" };

            await handleGetSyncHistory(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 100 })
            );
        });
    });

    describe("handleGetAutoSyncSettings", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleGetAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 403 if user is not Pro", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({ rows: [{ subscribed: false }] });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleGetAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Auto-sync is a Pro feature" });
        });

        it("should return 400 for invalid provider", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(false);
            mockPool.query.mockResolvedValue({ rows: [{ subscribed: true }] });
            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "invalid" };

            await handleGetAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Invalid provider" });
        });

        it("should return defaults if no settings exist", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (getProviderConfig as ReturnType<typeof vi.fn>).mockReturnValue({
                supportedDataTypes: ["workouts", "calories_burned"]
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            await handleGetAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                isEnabled: false,
                frequencyMinutes: 60,
                dataTypes: ["workouts", "calories_burned"],
                consecutiveFailures: 0,
                disabledDueToFailure: false
            });
        });

        it("should return existing settings", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);

            const mockSettings = {
                is_enabled: true,
                sync_frequency_minutes: 30,
                sync_data_types: ["workouts"],
                consecutive_failures: 2,
                last_failure_at: new Date("2024-01-01"),
                last_failure_reason: "API error",
                disabled_due_to_failure: false
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [mockSettings] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };

            await handleGetAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                isEnabled: true,
                frequencyMinutes: 30,
                dataTypes: ["workouts"],
                consecutiveFailures: 2,
                lastFailureAt: "2024-01-01T00:00:00.000Z",
                lastFailureReason: "API error",
                disabledDueToFailure: false
            });
        });
    });

    describe("handleUpdateAutoSyncSettings", () => {
        it("should return 401 if no token provided", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleUpdateAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 403 if user is not Pro", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockPool.query.mockResolvedValue({ rows: [{ subscribed: false }] });
            mockRequest.headers = { authorization: "Bearer valid_token" };

            await handleUpdateAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Auto-sync is a Pro feature" });
        });

        it("should return 400 if integration not connected", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.body = { isEnabled: true };

            await handleUpdateAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Integration not connected. Connect first before enabling auto-sync."
            });
        });

        it("should update settings successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (getProviderConfig as ReturnType<typeof vi.fn>).mockReturnValue({
                supportedDataTypes: ["workouts", "calories_burned"]
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [{ status: "active" }] })
                .mockResolvedValueOnce({ rows: [] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.body = { isEnabled: true, frequencyMinutes: 30 };

            await handleUpdateAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                isEnabled: true,
                frequencyMinutes: 30,
                dataTypes: ["workouts", "calories_burned"]
            });
        });

        it("should enforce minimum frequency of 15 minutes", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (getProviderConfig as ReturnType<typeof vi.fn>).mockReturnValue({
                supportedDataTypes: ["workouts"]
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [{ status: "active" }] })
                .mockResolvedValueOnce({ rows: [] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.body = { isEnabled: true, frequencyMinutes: 5 };

            await handleUpdateAutoSyncSettings(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({ frequencyMinutes: 15 })
            );
        });
    });

    describe("handleEnableAutoSync", () => {
        it("should set isEnabled to true and call update handler", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (getProviderConfig as ReturnType<typeof vi.fn>).mockReturnValue({
                supportedDataTypes: ["workouts"]
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [{ status: "active" }] })
                .mockResolvedValueOnce({ rows: [] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.body = {};

            await handleEnableAutoSync(mockRequest as Request, mockResponse as Response);

            expect(mockRequest.body.isEnabled).toBe(true);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe("handleDisableAutoSync", () => {
        it("should set isEnabled to false and call update handler", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            (isValidProvider as ReturnType<typeof vi.fn>).mockReturnValue(true);
            (isIntegrationEnabled as ReturnType<typeof vi.fn>).mockResolvedValue(true);
            (getProviderConfig as ReturnType<typeof vi.fn>).mockReturnValue({
                supportedDataTypes: ["workouts"]
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [{ subscribed: true }] })
                .mockResolvedValueOnce({ rows: [{ status: "active" }] })
                .mockResolvedValueOnce({ rows: [] });

            mockRequest.headers = { authorization: "Bearer valid_token" };
            mockRequest.params = { provider: "strava" };
            mockRequest.body = {};

            await handleDisableAutoSync(mockRequest as Request, mockResponse as Response);

            expect(mockRequest.body.isEnabled).toBe(false);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });
});
