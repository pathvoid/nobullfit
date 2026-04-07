import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleSignUp } from "./signUpHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/emailService", () => ({
    sendWelcomeEmail: vi.fn()
}));

vi.mock("bcryptjs", () => ({
    default: {
        hash: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import { sendWelcomeEmail } from "../utils/emailService.js";
import bcrypt from "bcryptjs";

describe("signUpHandler", () => {
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

    it("should sign up successfully with valid data", async () => {
        mockRequest.body = {
            email: "newuser@example.com",
            name: "New User",
            password: "password123",
            country: "US",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        // User doesn't exist
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Insert user
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: 1, email: "newuser@example.com", full_name: "New User", created_at: new Date() }]
        });
        // Create default user settings
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("hashed_password");
        (sendWelcomeEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
        expect(mockPool.query).toHaveBeenCalledTimes(3);
        // Verify user_settings was created with default 30 days and communication preferences
        expect(mockPool.query).toHaveBeenCalledWith(
            "INSERT INTO user_settings (user_id, quick_add_days, communication_email, communication_sms, communication_push) VALUES ($1, 30, true, false, false)",
            [1]
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            redirect: "/sign-in"
        });
    });

    it("should return 400 if required fields are missing", async () => {
        mockRequest.body = {
            email: "test@example.com"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "All fields are required and you must accept the Terms of Service and Privacy Policy."
        });
    });

    it("should return 400 if terms are not accepted", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: "Test User",
            password: "password123",
            terms: false,
            captcha: "5",
            captchaAnswer: "5"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "All fields are required and you must accept the Terms of Service and Privacy Policy."
        });
    });

    it("should return 400 if CAPTCHA is incorrect", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: "Test User",
            password: "password123",
            terms: true,
            captcha: "5",
            captchaAnswer: "7"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "CAPTCHA verification failed. Please solve the math problem correctly."
        });
    });

    it("should return 400 for invalid email format", async () => {
        mockRequest.body = {
            email: "invalid-email",
            name: "Test User",
            password: "password123",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Please enter a valid email address."
        });
    });

    it("should return 400 if name contains a URL", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: "https://www.google.com",
            password: "password123",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Name can only contain letters, spaces, hyphens, and apostrophes."
        });
    });

    it("should return 400 if name contains HTML tags", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: '<a href="https://evil.com">Click</a>',
            password: "password123",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Name can only contain letters, spaces, hyphens, and apostrophes."
        });
    });

    it("should accept names with accented characters", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: "José O'Brien-García",
            password: "password123",
            country: "US",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        // User doesn't exist
        mockPool.query.mockResolvedValueOnce({ rows: [] });
        // Insert user
        mockPool.query.mockResolvedValueOnce({
            rows: [{ id: 1, email: "test@example.com", full_name: "José O'Brien-García", created_at: new Date() }]
        });
        // Create default user settings
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("hashed_password");
        (sendWelcomeEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            redirect: "/sign-in"
        });
    });

    it("should return 400 if password is too short", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: "Test User",
            password: "short",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Password must be between 8 and 72 characters long."
        });
    });

    it("should return same success response if user already exists to prevent email enumeration", async () => {
        mockRequest.body = {
            email: "existing@example.com",
            name: "Test User",
            password: "password123",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        // User exists
        mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            redirect: "/sign-in"
        });
    });

    it("should return 500 if database connection fails", async () => {
        mockRequest.body = {
            email: "test@example.com",
            name: "Test User",
            password: "password123",
            terms: true,
            captcha: "5",
            captchaAnswer: "5"
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Database connection not available. Please try again later."
        });
    });
});
