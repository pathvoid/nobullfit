// Phone verification handler - OTP flow for SMS delivery
// Handles sending verification codes, verifying them, and removing phone numbers

import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import { sendSMS } from "../utils/twilioService.js";
import { validatePhoneNumber } from "../utils/phoneValidation.js";

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

// Generate a 6-digit verification code
function generateOTP(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// Send a verification code to the user's phone number
export async function handleSendVerificationCode(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            res.status(400).json({ error: "Phone number is required" });
            return;
        }

        // Validate phone number (format, type, and safety checks)
        const validation = validatePhoneNumber(phoneNumber);
        if (!validation.valid) {
            res.status(400).json({ error: validation.error });
            return;
        }

        // Rate limit: max 3 codes per hour per user
        const rateLimitResult = await pool.query(
            `SELECT COUNT(*) as code_count FROM phone_verifications
             WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
            [userId]
        );
        const codeCount = parseInt(rateLimitResult.rows[0]?.code_count || "0", 10);
        if (codeCount >= 3) {
            res.status(429).json({ error: "Too many verification attempts. Please try again in an hour." });
            return;
        }

        // Generate OTP and store
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        await pool.query(
            `INSERT INTO phone_verifications (user_id, phone_number, code, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [userId, phoneNumber, code, expiresAt.toISOString()]
        );

        // Send SMS with verification code
        await sendSMS(
            phoneNumber,
            `Your NoBullFit verification code is: ${code}. It expires in 10 minutes.`
        );

        res.status(200).json({ success: true, message: "Verification code sent" });
    } catch (error) {
        console.error("Error sending verification code:", error);
        res.status(500).json({ error: "Failed to send verification code" });
    }
}

// Verify the OTP code submitted by the user
export async function handleVerifyCode(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        const { phoneNumber, code } = req.body;

        if (!phoneNumber || !code) {
            res.status(400).json({ error: "Phone number and code are required" });
            return;
        }

        // Fetch the most recent unexpired, unverified code for this user and phone
        const verificationResult = await pool.query(
            `SELECT id, code, attempts, expires_at FROM phone_verifications
             WHERE user_id = $1 AND phone_number = $2 AND verified = false AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [userId, phoneNumber]
        );

        if (verificationResult.rows.length === 0) {
            res.status(400).json({ error: "No valid verification code found. Please request a new code." });
            return;
        }

        const verification = verificationResult.rows[0];

        // Check max attempts (5)
        if (verification.attempts >= 5) {
            res.status(400).json({ error: "Too many failed attempts. Please request a new code." });
            return;
        }

        // Increment attempts
        await pool.query(
            "UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = $1",
            [verification.id]
        );

        // Check code
        if (verification.code !== code) {
            const remaining = 4 - verification.attempts;
            res.status(400).json({
                error: `Invalid verification code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
            });
            return;
        }

        // Code matches - mark as verified
        await pool.query(
            "UPDATE phone_verifications SET verified = true WHERE id = $1",
            [verification.id]
        );

        // Update phone number and verification status in user_settings
        await pool.query(
            `INSERT INTO user_settings (user_id, phone_number, phone_verified, updated_at)
             VALUES ($1, $2, true, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id)
             DO UPDATE SET phone_number = $2, phone_verified = true, updated_at = CURRENT_TIMESTAMP`,
            [userId, phoneNumber]
        );

        res.status(200).json({ success: true, message: "Phone number verified successfully" });
    } catch (error) {
        console.error("Error verifying code:", error);
        res.status(500).json({ error: "Failed to verify code" });
    }
}

// Remove verified phone number
export async function handleRemovePhone(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database unavailable" });
            return;
        }

        // Clear phone number in user_settings
        await pool.query(
            "UPDATE user_settings SET phone_number = NULL, phone_verified = false, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
            [userId]
        );

        res.status(200).json({ success: true, message: "Phone number removed" });
    } catch (error) {
        console.error("Error removing phone:", error);
        res.status(500).json({ error: "Failed to remove phone number" });
    }
}
