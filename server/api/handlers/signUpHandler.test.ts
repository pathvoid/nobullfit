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

        (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("hashed_password");
        (sendWelcomeEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await handleSignUp(mockRequest as Request, mockResponse as Response);

        expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
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
            error: "Password must be at least 8 characters long."
        });
    });

    it("should return 409 if user already exists", async () => {
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

        expect(mockResponse.status).toHaveBeenCalledWith(409);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "An account with this email already exists."
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
