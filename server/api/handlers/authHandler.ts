import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";

// Get current user from JWT token
export async function handleGetMe(req: Request, res: Response): Promise<void> {
    try {
        // Check for token in Authorization header first
        let token: string | undefined;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            // Fallback to cookie if no Authorization header
            const cookieToken = (req as Request & { cookies?: { auth_token?: string } }).cookies?.auth_token;
            if (cookieToken) {
                token = cookieToken;
            }
        }

        if (!token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // Verify JWT token
        const decoded = verifyToken(token);
        if (!decoded) {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }

        // Get database connection
        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get user data from database
        const userResult = await pool.query(
            "SELECT id, email, full_name, plan, subscribed, token_version FROM users WHERE id = $1 AND email = $2",
            [decoded.userId, decoded.email]
        );

        if (userResult.rows.length === 0) {
            res.status(401).json({ error: "User not found" });
            return;
        }

        const user = userResult.rows[0];

        // Check if token version matches (invalidates old tokens after password reset/change).
        // Unconditional: tokens missing the claim are treated as version 0 so legacy/forged
        // tokens without tokenVersion cannot bypass the check.
        if (user.token_version !== (decoded.tokenVersion ?? 0)) {
            res.status(401).json({ error: "Session expired. Please sign in again." });
            return;
        }

        res.status(200).json({
            user: { id: user.id, email: user.email, full_name: user.full_name, plan: user.plan, subscribed: user.subscribed }
        });
    } catch (error) {
        console.error("Auth check error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Logout handler - JWT tokens are stateless, so we just return success
// In a more advanced setup, you could maintain a token blacklist
export async function handleLogout(req: Request, res: Response): Promise<void> {
    // Clear auth cookie
    res.clearCookie("auth_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });
    
    // JWT tokens are stateless, so logout is handled client-side by removing the token
    // Optionally, you could maintain a token blacklist in the database
    res.status(200).json({ success: true });
}
