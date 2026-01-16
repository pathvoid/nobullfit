import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleSignIn } from "./signInHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    generateToken: vi.fn()
}));

vi.mock("bcryptjs", () => ({
    default: {
        compare: vi.fn()
    }
}));

import getPool from "../../db/connection.js";
import { generateToken } from "../utils/jwt.js";
import bcrypt from "bcryptjs";

describe("signInHandler", () => {
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
            json: vi.fn().mockReturnThis(),
            cookie: vi.fn().mockReturnThis()
        };
    });

    it("should sign in successfully with valid credentials and redirect to dashboard if plan exists", async () => {
        mockRequest.body = {
            email: "test@example.com",
            password: "password123",
            remember: true
        };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            password_hash: "hashed_password",
            plan: "free"
        };

        mockPool.query.mockResolvedValue({ rows: [mockUser] });
        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (generateToken as ReturnType<typeof vi.fn>).mockReturnValue("mock_token");

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed_password");
        expect(generateToken).toHaveBeenCalledWith(1, "test@example.com", true);
        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            user: {
                id: 1,
                email: "test@example.com",
                full_name: "Test User",
                plan: "free"
            },
            token: "mock_token",
            redirect: "/dashboard"
        });
    });

    it("should redirect to choose-plan if user has no plan selected", async () => {
        mockRequest.body = {
            email: "test@example.com",
            password: "password123",
            remember: false
        };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            password_hash: "hashed_password",
            plan: null
        };

        mockPool.query.mockResolvedValue({ rows: [mockUser] });
        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (generateToken as ReturnType<typeof vi.fn>).mockReturnValue("mock_token");

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            user: {
                id: 1,
                email: "test@example.com",
                full_name: "Test User",
                plan: null
            },
            token: "mock_token",
            redirect: "/choose-plan"
        });
    });

    it("should return 400 if email is missing", async () => {
        mockRequest.body = {
            password: "password123"
        };

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Email and password are required."
        });
    });

    it("should return 400 if password is missing", async () => {
        mockRequest.body = {
            email: "test@example.com"
        };

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Email and password are required."
        });
    });

    it("should return 400 for invalid email format", async () => {
        mockRequest.body = {
            email: "invalid-email",
            password: "password123"
        };

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Please enter a valid email address."
        });
    });

    it("should return 401 if user does not exist", async () => {
        mockRequest.body = {
            email: "nonexistent@example.com",
            password: "password123"
        };

        mockPool.query.mockResolvedValue({ rows: [] });

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Invalid email or password."
        });
    });

    it("should return 401 if password is incorrect", async () => {
        mockRequest.body = {
            email: "test@example.com",
            password: "wrongpassword"
        };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            password_hash: "hashed_password"
        };

        mockPool.query.mockResolvedValue({ rows: [mockUser] });
        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Invalid email or password."
        });
    });

    it("should return 500 if database connection fails", async () => {
        mockRequest.body = {
            email: "test@example.com",
            password: "password123"
        };

        (getPool as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await handleSignIn(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Database connection not available. Please try again later."
        });
    });
});
