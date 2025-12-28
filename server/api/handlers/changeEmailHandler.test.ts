import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleChangeEmailRequest, handleConfirmEmailChange } from "./changeEmailHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/emailService", () => ({
    sendEmailChangeConfirmationEmail: vi.fn()
}));

vi.mock("crypto", () => ({
    default: {
        randomBytes: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { sendEmailChangeConfirmationEmail } from "../utils/emailService.js";
import crypto from "crypto";

describe("changeEmailHandler", () => {
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
            cookies: {}
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    describe("handleChangeEmailRequest", () => {
        it("should request email change successfully", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "old@example.com" });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = { email: "new@example.com" };

            // Get current user
            mockPool.query.mockResolvedValueOnce({ rows: [{ email: "old@example.com" }] });
            // Check new email availability
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Delete existing request
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Insert new request
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            (crypto.randomBytes as ReturnType<typeof vi.fn>).mockReturnValue({
                toString: () => "mock_token"
            });
            (sendEmailChangeConfirmationEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

            await handleChangeEmailRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "A confirmation email has been sent to your new email address."
            });
        });

        it("should return 401 if not authenticated", async () => {
            mockRequest.headers = {};
            mockRequest.cookies = {};

            await handleChangeEmailRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Authentication required."
            });
        });

        it("should return 400 if email is missing", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = {};

            await handleChangeEmailRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Email address is required."
            });
        });

        it("should return 400 for invalid email format", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = { email: "invalid-email" };

            await handleChangeEmailRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid email format."
            });
        });

        it("should return 400 if new email is same as current", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = { email: "current@example.com" };

            mockPool.query.mockResolvedValue({ rows: [{ email: "current@example.com" }] });

            await handleChangeEmailRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "This is already your current email address."
            });
        });

        it("should return 400 if email is already in use", async () => {
            (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
            mockRequest.headers = { authorization: "Bearer token" };
            mockRequest.body = { email: "taken@example.com" };

            // Get current user
            mockPool.query.mockResolvedValueOnce({ rows: [{ email: "old@example.com" }] });
            // New email is taken
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });

            await handleChangeEmailRequest(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "This email address is already in use."
            });
        });
    });

    describe("handleConfirmEmailChange", () => {
        it("should confirm email change successfully", async () => {
            mockRequest.body = { token: "valid_token" };

            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);

            // Token exists
            mockPool.query.mockResolvedValueOnce({
                rows: [{ user_id: 1, new_email: "new@example.com", expires_at: futureDate }]
            });
            // Email is available
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Update email
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Delete token
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleConfirmEmailChange(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Email address has been successfully updated."
            });
        });

        it("should return 400 if token is missing", async () => {
            mockRequest.body = {};

            await handleConfirmEmailChange(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Token is required."
            });
        });

        it("should return 400 if token is invalid", async () => {
            mockRequest.body = { token: "invalid_token" };

            mockPool.query.mockResolvedValue({ rows: [] });

            await handleConfirmEmailChange(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Invalid or expired confirmation token."
            });
        });

        it("should return 400 if token is expired", async () => {
            mockRequest.body = { token: "expired_token" };

            const pastDate = new Date();
            pastDate.setHours(pastDate.getHours() - 1);

            // Token exists but expired
            mockPool.query.mockResolvedValueOnce({
                rows: [{ user_id: 1, new_email: "new@example.com", expires_at: pastDate }]
            });
            // Delete expired token
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await handleConfirmEmailChange(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: "Confirmation token has expired. Please request a new email change."
            });
        });
    });
});
