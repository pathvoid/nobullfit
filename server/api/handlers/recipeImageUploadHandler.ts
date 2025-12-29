import type { Request, Response } from "express";
import multer from "multer";
import { verifyToken } from "../utils/jwt.js";
import { uploadRecipeImage } from "../utils/r2Service.js";

// Configure multer to store files in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    }
});

// Helper function to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    } else {
        const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
        if (cookieToken) {
            token = cookieToken;
        }
    }

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    return decoded ? decoded.userId : null;
}

// Upload recipe image
export const uploadRecipeImageHandler = [
    upload.single("image"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = await getUserIdFromRequest(req);
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!req.file) {
                res.status(400).json({ error: "No image file provided" });
                return;
            }

            const filename = await uploadRecipeImage(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );

            res.status(200).json({
                success: true,
                filename
            });
        } catch (error) {
            console.error("Error uploading recipe image:", error);
            res.status(500).json({ 
                error: error instanceof Error ? error.message : "Internal server error" 
            });
        }
    }
];
