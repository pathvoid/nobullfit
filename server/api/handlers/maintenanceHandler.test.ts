import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGetMaintenanceStatus } from "./maintenanceHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

import getPool from "../../db/connection.js";

describe("maintenanceHandler", () => {
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

    describe("handleGetMaintenanceStatus", () => {
        it("should return no maintenance when none scheduled", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetMaintenanceStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                hasUpcoming: false,
                isInProgress: false,
                maintenance: null
            });
        });

        it("should return upcoming maintenance when scheduled within 5 days", async () => {
            const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
            const endDate = new Date(futureDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

            // First query: get maintenance schedules
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    start_time: futureDate,
                    end_time: endDate,
                    is_active: true
                }]
            });
            // Second query: check if in progress
            mockPool.query.mockResolvedValueOnce({
                rows: [{ is_in_progress: false }]
            });

            await handleGetMaintenanceStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                hasUpcoming: true,
                isInProgress: false,
                maintenance: {
                    startTime: futureDate.toISOString(),
                    endTime: endDate.toISOString()
                }
            });
        });

        it("should return in-progress maintenance when currently active", async () => {
            const pastDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
            const futureDate = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

            // First query: get maintenance schedules
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    start_time: pastDate,
                    end_time: futureDate,
                    is_active: true
                }]
            });
            // Second query: check if in progress
            mockPool.query.mockResolvedValueOnce({
                rows: [{ is_in_progress: true }]
            });

            await handleGetMaintenanceStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                hasUpcoming: false,
                isInProgress: true,
                maintenance: {
                    startTime: pastDate.toISOString(),
                    endTime: futureDate.toISOString()
                }
            });
        });

        it("should return 500 when database is not available", async () => {
            (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            await handleGetMaintenanceStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Database connection not available"
            });
        });

        it("should return 500 on database error", async () => {
            mockPool.query.mockRejectedValueOnce(new Error("Database error"));

            await handleGetMaintenanceStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Internal server error"
            });
        });

        it("should query using PostgreSQL NOW() for timezone consistency", async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGetMaintenanceStatus(mockRequest as Request, mockResponse as Response);

            // Verify the query was called
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [query] = mockPool.query.mock.calls[0];
            
            // Query should select from maintenance_schedules
            expect(query).toContain("maintenance_schedules");
            expect(query).toContain("is_active = true");
            
            // Should use PostgreSQL's NOW() function for consistent timezone handling
            expect(query).toContain("NOW()");
            expect(query).toContain("INTERVAL '5 days'");
        });
    });
});
