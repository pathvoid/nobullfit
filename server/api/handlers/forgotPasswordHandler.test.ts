import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleForgotPassword } from "./forgotPasswordHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/emailService", () => ({
    sendPasswordResetEmail: vi.fn()
}));

vi.mock("crypto", () => ({
    default: {
        randomBytes: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";
import crypto from "crypto";

describe("forgotPasswordHandler", () => {
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

    it("should send password reset email for existing user", async () => {
        mockRequest.body = {
            email: "test@example.com"
        };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User"
        };

        // User exists
        mockPool.query.mockResolvedValueOnce({ rows: [mockUser] });
        // No existing rate limit
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Insert rate limit
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Insert token
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        (crypto.randomBytes as ReturnType<typeof vi.fn>).mockReturnValue({
            toString: () => "mock_reset_token"
        });
        (sendPasswordResetEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await handleForgotPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
        });
    });

    it("should return success even for non-existent user (security)", async () => {
        mockRequest.body = {
            email: "nonexistent@example.com"
        };

        // User doesn't exist
        mockPool.query.mockResolvedValue({ rows: [] });

        await handleForgotPassword(mockRequest as Request, mockResponse as Response);

        // Should still return success to prevent email enumeration
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
        });
    });

    it("should return 400 if email is missing", async () => {
        mockRequest.body = {};

        await handleForgotPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Email is required."
        });
    });

    it("should return 400 for invalid email format", async () => {
        mockRequest.body = {
            email: "invalid-email"
        };

        await handleForgotPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Please enter a valid email address."
        });
    });

    it("should return 500 if database connection fails", async () => {
        mockRequest.body = {
            email: "test@example.com"
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await handleForgotPassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Database connection not available. Please try again later."
        });
    });
});
