import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import {
    handleTriggerSync,
    handleGetSyncHistory
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
    isValidProvider: vi.fn()
}));

vi.mock("../utils/encryptionService", () => ({
    decryptToken: vi.fn(),
    encryptToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { isIntegrationEnabled } from "../utils/featureFlagService.js";
import { isValidProvider } from "../utils/integrationProviders/index.js";

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
});
