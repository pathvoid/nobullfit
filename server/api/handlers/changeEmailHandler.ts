import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import { verifyToken } from "../utils/jwt.js";
import crypto from "crypto";
import { sendEmailChangeConfirmationEmail } from "../utils/emailService.js";
import { updateCustomerEmail } from "../utils/paddleService.js";

export async function handleChangeEmailRequest(req: Request, res: Response) {
    try {
        const pool = await getPool();
        if (!pool) {
            return res.status(503).json({ error: "Database connection not available. Please try again later." });
        }

        // Verify authentication
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace("Bearer ", "") || req.cookies?.auth_token;

        if (!token) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const decoded = verifyToken(token);
        if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
            return res.status(401).json({ error: "Invalid or expired token." });
        }

        const userId = decoded.userId as number;
        const { email: newEmail } = req.body;

        // Validate input
        if (!newEmail || typeof newEmail !== "string") {
            return res.status(400).json({ error: "Email address is required." });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // Get current user
        const userResult = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        const currentEmail = userResult.rows[0].email;

        // Check if email is the same
        if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
            return res.status(400).json({ error: "This is already your current email address." });
        }

        // Check if new email is already in use
        const existingUserResult = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [newEmail]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ error: "This email address is already in use." });
        }

        // Check for existing pending request for this user
        await pool.query("DELETE FROM email_change_requests WHERE user_id = $1", [userId]);

        // Generate secure token for email change confirmation
        const emailChangeToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

        // Store email change request
        await pool.query(
            "INSERT INTO email_change_requests (user_id, new_email, token, expires_at) VALUES ($1, $2, $3, $4)",
            [userId, newEmail.toLowerCase(), emailChangeToken, expiresAt]
        );

        // Send confirmation email
        try {
            await sendEmailChangeConfirmationEmail(newEmail, currentEmail, emailChangeToken);
        } catch (emailError) {
            // Log error but don't fail the request
            console.error("Failed to send email change confirmation email:", emailError);
        }

        return res.status(200).json({ 
            message: "A confirmation email has been sent to your new email address." 
        });
    } catch (error) {
        console.error("Error handling email change request:", error);
        return res.status(500).json({ error: "An error occurred. Please try again later." });
    }
}

export async function handleConfirmEmailChange(req: Request, res: Response) {
    try {
        const pool = await getPool();
        if (!pool) {
            return res.status(503).json({ error: "Database connection not available. Please try again later." });
        }

        let { token } = req.body;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "Token is required." });
        }

        // Trim whitespace from token
        token = token.trim();

        // Find email change request
        const requestResult = await pool.query(
            "SELECT user_id, new_email, expires_at FROM email_change_requests WHERE token = $1",
            [token]
        );

        if (requestResult.rows.length === 0) {
            // Token not found - check if email was already changed (token might have been used already)
            // This can happen if the request is made twice (e.g., React Strict Mode)
            // We can't easily check this without storing more info, so return error
            // The component should prevent duplicate requests, but this is a safety net
            return res.status(400).json({ error: "Invalid or expired confirmation token." });
        }

        const { user_id, new_email, expires_at } = requestResult.rows[0];

        // Check if expired
        if (new Date(expires_at) < new Date()) {
            await pool.query("DELETE FROM email_change_requests WHERE token = $1", [token]);
            return res.status(400).json({ error: "Confirmation token has expired. Please request a new email change." });
        }

        // Check if new email is still available (might have been taken since request)
        const existingUserResult = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [new_email]);
        if (existingUserResult.rows.length > 0) {
            // Check if it's the same user (email already changed)
            const existingUserId = existingUserResult.rows[0].id;
            if (existingUserId === user_id) {
                // Email was already changed - token was already used
                await pool.query("DELETE FROM email_change_requests WHERE token = $1", [token]);
                return res.status(200).json({ 
                    message: "Email address has been successfully updated." 
                });
            }
            // Different user has this email
            await pool.query("DELETE FROM email_change_requests WHERE token = $1", [token]);
            return res.status(400).json({ error: "This email address is already in use." });
        }

        // Get the user's Paddle customer ID to update their email in Paddle
        const userResult = await pool.query("SELECT paddle_customer_id FROM users WHERE id = $1", [user_id]);
        const paddleCustomerId = userResult.rows[0]?.paddle_customer_id;

        // Update user email in database
        await pool.query("UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [new_email, user_id]);

        // Update email in Paddle if customer exists
        if (paddleCustomerId) {
            const paddleResult = await updateCustomerEmail(paddleCustomerId, new_email);
            
            if (!paddleResult.success && !paddleResult.conflict) {
                // Log non-conflict failures but don't fail the overall request
                // Note: conflicts are expected when email already exists on another Paddle customer
                console.error("Failed to update email in Paddle (non-conflict error)");
            }
        }

        // Delete the used token
        await pool.query("DELETE FROM email_change_requests WHERE token = $1", [token]);

        return res.status(200).json({ 
            message: "Email address has been successfully updated." 
        });
    } catch (error) {
        console.error("Error confirming email change:", error);
        return res.status(500).json({ error: "An error occurred. Please try again later." });
    }
}
