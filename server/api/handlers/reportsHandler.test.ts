import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleGenerateDashboardReport } from "./reportsHandler.js";

// Mock puppeteer
vi.mock("puppeteer", () => ({
    default: {
        launch: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
                setContent: vi.fn().mockResolvedValue(undefined),
                pdf: vi.fn().mockResolvedValue(Buffer.from("mock-pdf-content"))
            }),
            close: vi.fn().mockResolvedValue(undefined)
        })
    }
}));

// Mock database connection
vi.mock("../../db/connection.js", () => ({
    default: vi.fn()
}));

// Mock JWT verification
vi.mock("../utils/jwt.js", () => ({
    verifyToken: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

describe("reportsHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockPool: {
        query: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            headers: {
                authorization: "Bearer valid-token"
            },
            body: {
                period: "week",
                timezone: "America/New_York"
            },
            cookies: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis()
        };

        mockPool = {
            query: vi.fn()
        };
    });

    describe("handleGenerateDashboardReport", () => {
        it("should return 401 if user is not authenticated", async () => {
            vi.mocked(verifyToken).mockReturnValue(null);

            await handleGenerateDashboardReport(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" });
        });

        it("should return 500 if database connection is not available", async () => {
            vi.mocked(verifyToken).mockReturnValue({ userId: 1, email: "test@example.com" });
            vi.mocked(getPool).mockResolvedValue(null);

            await handleGenerateDashboardReport(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "Database connection not available" });
        });

        it("should return 404 if user is not found", async () => {
            vi.mocked(verifyToken).mockReturnValue({ userId: 1, email: "test@example.com" });
            vi.mocked(getPool).mockResolvedValue(mockPool as unknown as Awaited<ReturnType<typeof getPool>>);
            
            // User query returns empty
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleGenerateDashboardReport(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: "User not found" });
        });

        it("should generate PDF report successfully", async () => {
            vi.mocked(verifyToken).mockReturnValue({ userId: 1, email: "test@example.com" });
            vi.mocked(getPool).mockResolvedValue(mockPool as unknown as Awaited<ReturnType<typeof getPool>>);
            
            // Mock all database queries
            mockPool.query
                // User query
                .mockResolvedValueOnce({ rows: [{ id: 1, email: "test@example.com", full_name: "Test User" }] })
                // Today's food
                .mockResolvedValueOnce({ rows: [{ calories: 2000, protein: 100, carbs: 200, fat: 80, food_count: 5 }] })
                // Today's activity
                .mockResolvedValueOnce({ rows: [{ calories_burned: 300, activity_count: 2 }] })
                // Weekly food
                .mockResolvedValueOnce({ rows: [] })
                // Weekly activity
                .mockResolvedValueOnce({ rows: [] })
                // Activity types
                .mockResolvedValueOnce({ rows: [] })
                // Categories
                .mockResolvedValueOnce({ rows: [] })
                // Weight
                .mockResolvedValueOnce({ rows: [] })
                // TDEE
                .mockResolvedValueOnce({ rows: [] });

            await handleGenerateDashboardReport(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it("should handle empty data gracefully", async () => {
            vi.mocked(verifyToken).mockReturnValue({ userId: 1, email: "test@example.com" });
            vi.mocked(getPool).mockResolvedValue(mockPool as unknown as Awaited<ReturnType<typeof getPool>>);
            
            // Mock all database queries with empty data
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ id: 1, email: "test@example.com", full_name: "New User" }] })
                .mockResolvedValueOnce({ rows: [{ calories: 0, protein: 0, carbs: 0, fat: 0, food_count: 0 }] })
                .mockResolvedValueOnce({ rows: [{ calories_burned: 0, activity_count: 0 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await handleGenerateDashboardReport(
                mockRequest as Request,
                mockResponse as Response
            );

            // Should still generate PDF successfully
            expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
            expect(mockResponse.send).toHaveBeenCalled();
        });
    });
});
