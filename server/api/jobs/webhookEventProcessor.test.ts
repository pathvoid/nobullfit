import { describe, it, expect, vi, beforeEach } from "vitest";
import { runWebhookEventProcessor } from "./webhookEventProcessor";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/encryptionService", () => ({
    decryptToken: vi.fn(),
    encryptToken: vi.fn()
}));

vi.mock("../utils/stravaRateLimitService", () => ({
    stravaFetch: vi.fn(),
    canMakeReadRequest: vi.fn(),
    getRetryAfterMs: vi.fn()
}));

vi.mock("../handlers/integrationSyncHandler", () => ({
    refreshStravaToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { decryptToken, encryptToken } from "../utils/encryptionService.js";
import { stravaFetch, canMakeReadRequest, getRetryAfterMs } from "../utils/stravaRateLimitService.js";
import { refreshStravaToken } from "../handlers/integrationSyncHandler.js";

describe("webhookEventProcessor", () => {
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockPool = {
            query: vi.fn()
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(mockPool);
        (canMakeReadRequest as ReturnType<typeof vi.fn>).mockReturnValue(true);
        (getRetryAfterMs as ReturnType<typeof vi.fn>).mockReturnValue(5000);
    });

    describe("runWebhookEventProcessor", () => {
        it("should do nothing if database pool is not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await runWebhookEventProcessor();

            expect(mockPool.query).not.toHaveBeenCalled();
        });

        it("should fetch and process unprocessed events", async () => {
            // No events to process
            mockPool.query.mockResolvedValue({ rows: [] });

            await runWebhookEventProcessor();

            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("SELECT id, object_type"),
                expect.arrayContaining([3, 10]) // MAX_RETRIES, BATCH_SIZE
            );
        });

        it("should process athlete deauthorization event", async () => {
            const mockEvent = {
                id: 1,
                object_type: "athlete",
                object_id: 12345,
                aspect_type: "update",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: { authorized: "false" },
                retry_count: 0
            };

            // First call: get events, Second call: find connection, Third: update connection, Fourth: mark processed
            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Find connection
                .mockResolvedValueOnce({ rows: [] }) // Update connection
                .mockResolvedValueOnce({ rows: [] }); // Mark as processed

            await runWebhookEventProcessor();

            // Should update connection status to disconnected
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE integration_connections"),
                expect.arrayContaining([1])
            );
        });

        it("should process activity delete event", async () => {
            const mockEvent = {
                id: 1,
                object_type: "activity",
                object_id: 99999,
                aspect_type: "delete",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: null,
                retry_count: 0
            };

            const mockConnection = {
                user_id: 1,
                access_token_encrypted: "encrypted_token",
                refresh_token_encrypted: "encrypted_refresh",
                token_expires_at: new Date(Date.now() + 3600000)
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [mockConnection] }) // Find connection
                .mockResolvedValueOnce({ rowCount: 1 }) // Delete activity
                .mockResolvedValueOnce({ rows: [] }); // Mark as processed

            await runWebhookEventProcessor();

            // Should delete activity from progress_tracking
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM progress_tracking"),
                expect.arrayContaining([1, 99999])
            );
        });

        it("should process activity create event", async () => {
            const mockEvent = {
                id: 1,
                object_type: "activity",
                object_id: 88888,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: null,
                retry_count: 0
            };

            const mockConnection = {
                user_id: 1,
                access_token_encrypted: "encrypted_token",
                refresh_token_encrypted: "encrypted_refresh",
                token_expires_at: new Date(Date.now() + 3600000)
            };

            const mockActivity = {
                id: 88888,
                name: "Morning Run",
                type: "Run",
                distance: 5000,
                moving_time: 1800,
                elapsed_time: 2000,
                start_date: "2024-01-15T08:00:00Z",
                start_date_local: "2024-01-15T08:00:00",
                timezone: "(GMT-08:00) America/Los_Angeles",
                calories: 350
            };

            (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue("decrypted_token");
            (stravaFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockActivity)
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [mockConnection] }) // Find connection
                .mockResolvedValueOnce({ rows: [] }) // Check if activity exists
                .mockResolvedValueOnce({ rows: [] }) // Insert activity
                .mockResolvedValueOnce({ rows: [] }); // Mark as processed

            await runWebhookEventProcessor();

            // Should fetch activity from Strava
            expect(stravaFetch).toHaveBeenCalledWith(
                expect.stringContaining("/activities/88888"),
                expect.any(Object)
            );

            // Should insert activity into progress_tracking
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO progress_tracking"),
                expect.arrayContaining([
                    1, // user_id
                    "Running", // mapped activity type
                    "Morning Run" // activity name
                ])
            );
        });

        it("should skip event if no active connection found", async () => {
            const mockEvent = {
                id: 1,
                object_type: "activity",
                object_id: 12345,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: null,
                retry_count: 0
            };

            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [] }) // No connection found
                .mockResolvedValueOnce({ rows: [] }); // Mark as processed

            await runWebhookEventProcessor();

            // Should mark as processed without error
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE strava_webhook_events SET processed = true"),
                expect.arrayContaining([1])
            );
        });

        it("should refresh token if expired and retry", async () => {
            const mockEvent = {
                id: 1,
                object_type: "activity",
                object_id: 77777,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: null,
                retry_count: 0
            };

            const expiredConnection = {
                user_id: 1,
                access_token_encrypted: "encrypted_token",
                refresh_token_encrypted: "encrypted_refresh",
                token_expires_at: new Date(Date.now() - 3600000) // Expired 1 hour ago
            };

            const newTokens = {
                accessToken: "new_access_token",
                refreshToken: "new_refresh_token",
                expiresAt: new Date(Date.now() + 3600000)
            };

            const mockActivity = {
                id: 77777,
                name: "Evening Ride",
                type: "Ride",
                distance: 10000,
                moving_time: 3600,
                elapsed_time: 3800,
                start_date: "2024-01-15T18:00:00Z",
                start_date_local: "2024-01-15T18:00:00",
                timezone: "(GMT-08:00) America/Los_Angeles"
            };

            (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue("decrypted_refresh");
            (encryptToken as ReturnType<typeof vi.fn>).mockReturnValue("encrypted_new");
            (refreshStravaToken as ReturnType<typeof vi.fn>).mockResolvedValue(newTokens);
            (stravaFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockActivity)
            });

            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [expiredConnection] }) // Find connection
                .mockResolvedValueOnce({ rows: [] }) // Update tokens
                .mockResolvedValueOnce({ rows: [] }) // Check if activity exists
                .mockResolvedValueOnce({ rows: [] }) // Insert activity
                .mockResolvedValueOnce({ rows: [] }); // Mark as processed

            await runWebhookEventProcessor();

            // Should call refresh token
            expect(refreshStravaToken).toHaveBeenCalledWith("decrypted_refresh");

            // Should update stored tokens
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE integration_connections"),
                expect.arrayContaining([1, "strava", "encrypted_new"])
            );
        });

        it("should increment retry count on error", async () => {
            const mockEvent = {
                id: 1,
                object_type: "activity",
                object_id: 55555,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: null,
                retry_count: 0
            };

            const mockConnection = {
                user_id: 1,
                access_token_encrypted: "encrypted_token",
                refresh_token_encrypted: null, // No refresh token
                token_expires_at: new Date(Date.now() - 3600000) // Expired
            };

            (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue("decrypted_token");

            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [mockConnection] }) // Find connection
                .mockResolvedValueOnce({ rows: [] }); // Update retry count

            await runWebhookEventProcessor();

            // Should increment retry count
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining("SET retry_count = retry_count + 1"),
                expect.arrayContaining([1])
            );
        });

        it("should skip processing if rate limited", async () => {
            const mockEvent = {
                id: 1,
                object_type: "activity",
                object_id: 44444,
                aspect_type: "create",
                owner_id: 67890,
                subscription_id: 111,
                event_time: new Date(),
                updates: null,
                retry_count: 0
            };

            const mockConnection = {
                user_id: 1,
                access_token_encrypted: "encrypted_token",
                refresh_token_encrypted: "encrypted_refresh",
                token_expires_at: new Date(Date.now() + 3600000)
            };

            (canMakeReadRequest as ReturnType<typeof vi.fn>).mockReturnValue(false);
            (decryptToken as ReturnType<typeof vi.fn>).mockReturnValue("decrypted_token");

            mockPool.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Get events
                .mockResolvedValueOnce({ rows: [mockConnection] }) // Find connection
                .mockResolvedValueOnce({ rows: [] }); // Update retry count (error)

            await runWebhookEventProcessor();

            // Should NOT call stravaFetch
            expect(stravaFetch).not.toHaveBeenCalled();
        });
    });
});
