import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

// Sign in handler - authenticates user and creates session
export async function handleSignIn(req: Request, res: Response): Promise<void> {
    try {
        const { email, password, remember } = req.body;

        // Basic validation
        if (!email || !password) {
            res.status(400).json({
                error: "Email and password are required."
            });
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                error: "Please enter a valid email address."
            });
            return;
        }

        // Get database connection
        const pool = await getPool();
        if (!pool) {
            console.error("Database pool not available");
            res.status(500).json({
                error: "Database connection not available. Please try again later."
            });
            return;
        }

        // Find user by email (case-insensitive)
        const userResult = await pool.query(
            "SELECT id, email, full_name, password_hash, plan FROM users WHERE LOWER(email) = LOWER($1)",
            [email]
        );

        if (userResult.rows.length === 0) {
            // Don't reveal if email exists or not for security
            res.status(401).json({
                error: "Invalid email or password."
            });
            return;
        }

        const user = userResult.rows[0];

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            res.status(401).json({
                error: "Invalid email or password."
            });
            return;
        }

        // Generate JWT token with appropriate expiration
        const token = generateToken(user.id, user.email, remember);

        // Set HTTP-only cookie for server-side authentication checks
        // Cookie expires based on remember flag (30 days if remember, session if not)
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            maxAge: remember ? 30 * 24 * 60 * 60 * 1000 : undefined // 30 days if remember, session if not
        };

        res.cookie("auth_token", token, cookieOptions);

        // Determine redirect based on whether user has selected a plan
        const redirectUrl = user.plan ? "/dashboard" : "/choose-plan";

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                plan: user.plan
            },
            token: token,
            redirect: redirectUrl
        });

    } catch (error) {
        console.error("Sign in error:", error);
        
        // Don't expose database errors to users
        res.status(500).json({
            error: "An error occurred while signing in. Please try again later."
        });
    }
}
