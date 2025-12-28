import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { handleChangePassword } from "./changePasswordHandler";

// Mock dependencies
vi.mock("../../db/connection", () => ({
    default: vi.fn()
}));

vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/emailService", () => ({
    sendPasswordChangeNotificationEmail: vi.fn()
}));

import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { sendPasswordChangeNotificationEmail } from "../utils/emailService.js";
import bcrypt from "bcryptjs";

vi.mock("bcryptjs", () => ({
    default: {
        compare: vi.fn(),
        hash: vi.fn()
    }
}));

describe("changePasswordHandler", () => {
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

    it("should change password successfully", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {
            currentPassword: "oldpassword123",
            newPassword: "newpassword123"
        };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            password_hash: "hashed_old_password"
        };

        // First compare is for current password (should match), second is for checking if new = old (should not match)
        (bcrypt.compare as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(true)  // Current password matches
            .mockResolvedValueOnce(false); // New password is different from old
        (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("hashed_new_password");
        (sendPasswordChangeNotificationEmail as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        mockPool.query
            .mockResolvedValueOnce({ rows: [mockUser] })
            .mockResolvedValueOnce({ rows: [] });

        await handleChangePassword(mockRequest as Request, mockResponse as Response);

        expect(bcrypt.compare).toHaveBeenCalledWith("oldpassword123", "hashed_old_password");
        expect(bcrypt.compare).toHaveBeenCalledWith("newpassword123", "hashed_old_password");
        expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
        expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE users SET password_hash"),
            expect.arrayContaining(["hashed_new_password", 1])
        );
        expect(sendPasswordChangeNotificationEmail).toHaveBeenCalledWith("test@example.com", "Test User");
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("should return 401 if password is incorrect", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {
            currentPassword: "wrongpassword",
            newPassword: "newpassword123"
        };

        const mockUser = {
            id: 1,
            email: "test@example.com",
            full_name: "Test User",
            password_hash: "hashed_old_password"
        };

        (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
        mockPool.query.mockResolvedValue({ rows: [mockUser] });

        await handleChangePassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Current password is incorrect."
        });
    });

    it("should return 401 if not authenticated", async () => {
        mockRequest.headers = {};
        mockRequest.cookies = {};

        await handleChangePassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Authentication required."
        });
    });

    it("should validate new password length", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1, email: "test@example.com" });
        mockRequest.headers = { authorization: "Bearer token" };
        mockRequest.body = {
            currentPassword: "oldpassword123",
            newPassword: "short"
        };

        await handleChangePassword(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "New password must be at least 8 characters long."
        });
    });
});
