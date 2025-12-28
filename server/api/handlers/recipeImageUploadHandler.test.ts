import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Mock dependencies before importing the handler
vi.mock("../utils/jwt", () => ({
    verifyToken: vi.fn()
}));

vi.mock("../utils/r2Service", () => ({
    uploadRecipeImage: vi.fn()
}));

vi.mock("multer", () => {
    const mockMulter = () => ({
        single: () => (req: Request, res: Response, next: () => void) => next()
    });
    mockMulter.memoryStorage = () => ({});
    return { default: mockMulter };
});

import { verifyToken } from "../utils/jwt.js";
import { uploadRecipeImage } from "../utils/r2Service.js";
import { uploadRecipeImageHandler } from "./recipeImageUploadHandler";

describe("recipeImageUploadHandler", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = {
            headers: {},
            cookies: {},
            file: undefined
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };
    });

    // The handler is an array with multer middleware and the actual handler
    // We'll test the actual handler function (second element)
    const getHandler = () => uploadRecipeImageHandler[1] as (req: Request, res: Response) => Promise<void>;

    it("should upload image successfully", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
        mockRequest.headers = { authorization: "Bearer valid_token" };
        mockRequest.file = {
            buffer: Buffer.from("test image data"),
            originalname: "test.jpg",
            mimetype: "image/jpeg",
            fieldname: "image",
            encoding: "7bit",
            size: 1024,
            stream: null as never,
            destination: "",
            filename: "",
            path: ""
        };

        (uploadRecipeImage as ReturnType<typeof vi.fn>).mockResolvedValue("uploaded_filename.jpg");

        const handler = getHandler();
        await handler(mockRequest as Request, mockResponse as Response);

        expect(uploadRecipeImage).toHaveBeenCalledWith(
            mockRequest.file!.buffer,
            "test.jpg",
            "image/jpeg"
        );
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            filename: "uploaded_filename.jpg"
        });
    });

    it("should return 401 if not authenticated", async () => {
        mockRequest.headers = {};
        mockRequest.cookies = {};

        const handler = getHandler();
        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Unauthorized"
        });
    });

    it("should return 400 if no file provided", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
        mockRequest.headers = { authorization: "Bearer valid_token" };
        mockRequest.file = undefined;

        const handler = getHandler();
        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "No image file provided"
        });
    });

    it("should return 500 if upload fails", async () => {
        (verifyToken as ReturnType<typeof vi.fn>).mockReturnValue({ userId: 1 });
        mockRequest.headers = { authorization: "Bearer valid_token" };
        mockRequest.file = {
            buffer: Buffer.from("test image data"),
            originalname: "test.jpg",
            mimetype: "image/jpeg",
            fieldname: "image",
            encoding: "7bit",
            size: 1024,
            stream: null as never,
            destination: "",
            filename: "",
            path: ""
        };

        (uploadRecipeImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Upload failed"));

        const handler = getHandler();
        await handler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: "Upload failed"
        });
    });
});
