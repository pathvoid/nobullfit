import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleResetPassword } from "./resetPasswordHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import bcrypt from "bcryptjs";

describe("resetPasswordHandler", () => {
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
            body: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    it("should reset password successfully with valid token", async () => {
        mockRequest.body = {
            token: "valid_token",
            password: "newpassword123"
        };

        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + 1);

        // Token exists and not expired
        mockPool.query.mockResolvedValueOnce({
            rows: [{ token: "valid_token", expires_at: futureDate, user_id: 1 }]
        });
        // User exists
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: 1, email: "test@example.com", full_name: "Test User" }]
        });
        // Update password
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Delete token
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("new_hashed_password");

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            message: "Password has been reset successfully."
        });
    });

    it("should return 400 if token is missing", async () => {
        mockRequest.body = {
            password: "newpassword123"
        };

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Token and password are required."
        });
    });

    it("should return 400 if password is missing", async () => {
        mockRequest.body = {
            token: "valid_token"
        };

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Token and password are required."
        });
    });

    it("should return 400 if password is too short", async () => {
        mockRequest.body = {
            token: "valid_token",
            password: "short"
        };

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Password must be at least 8 characters long."
        });
    });

    it("should return 400 if token is invalid", async () => {
        mockRequest.body = {
            token: "invalid_token",
            password: "newpassword123"
        };

        // Token not found
        mockPool.query.mockResolvedValue({ rows: [] });

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Invalid or expired reset token. Please request a new password reset."
        });
    });

    it("should return 400 if token is expired", async () => {
        mockRequest.body = {
            token: "expired_token",
            password: "newpassword123"
        };

        const pastDate = new Date();
        pastDate.setHours(pastDate.getHours() - 1);

        // Token exists but expired
        mockPool.query.mockResolvedValue({
            rows: [{ token: "expired_token", expires_at: pastDate, user_id: 1 }]
        });

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Invalid or expired reset token. Please request a new password reset."
        });
    });

    it("should return 500 if database connection fails", async () => {
        mockRequest.body = {
            token: "valid_token",
            password: "newpassword123"
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await handleResetPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Database connection not available. Please try again later."
        });
    });
});
