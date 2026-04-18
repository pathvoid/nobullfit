import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

// Dummy hash used to equalize bcrypt timing when the submitted email does not
// match any user. Computed lazily so the module can be imported in environments
// that mock bcrypt (e.g. unit tests).
let cachedDummyPasswordHash: string | null = null;
function getDummyPasswordHash(): string {
    if (cachedDummyPasswordHash === null) {
        cachedDummyPasswordHash = bcrypt.hashSync("invalid-placeholder-password", 12);
    }
    return cachedDummyPasswordHash;
}

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
            "SELECT id, email, full_name, password_hash, plan, token_version FROM users WHERE LOWER(email) = LOWER($1)",
            [email]
        );

        if (userResult.rows.length === 0) {
            // Run a dummy bcrypt.compare so response timing matches the user-exists
            // branch. Prevents enumerating accounts via sign-in latency.
            await bcrypt.compare(password, getDummyPasswordHash());
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
        const token = generateToken(user.id, user.email, remember, user.token_version);

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
