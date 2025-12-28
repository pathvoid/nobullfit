import type { Request, Response } from "express";
import getPool from "../../db/connection.js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "../utils/emailService.js";

// Sign up handler - processes user registration
export async function handleSignUp(req: Request, res: Response): Promise<void> {
    try {
        const { email, name, password, country, terms, captcha, captchaAnswer } = req.body;

        // Basic validation
        if (!email || !name || !password || !terms) {
            res.status(400).json({
                error: "All fields are required and you must accept the Terms of Service and Privacy Policy."
            });
            return;
        }

        // Validate CAPTCHA
        const userAnswer = parseInt(captcha?.toString().trim() || "", 10);
        const correctAnswer = parseInt(captchaAnswer?.toString().trim() || "", 10);
        
        if (isNaN(userAnswer) || isNaN(correctAnswer) || userAnswer !== correctAnswer) {
            res.status(400).json({
                error: "CAPTCHA verification failed. Please solve the math problem correctly."
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

        // Validate password length (minimum 8 characters)
        if (password.length < 8) {
            res.status(400).json({
                error: "Password must be at least 8 characters long."
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

        // Check if user already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            res.status(409).json({
                error: "An account with this email already exists."
            });
            return;
        }

        // Hash password using bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await pool.query(
            `INSERT INTO users (email, full_name, password_hash, country, terms_accepted, terms_accepted_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
             RETURNING id, email, full_name, created_at`,
            [email, name, passwordHash, country || null, terms === true || terms === "on"]
        );

        const newUser = result.rows[0];

        // Send welcome email (don't wait for it to complete)
        sendWelcomeEmail(email, name).catch((error) => {
            console.error("Failed to send welcome email:", error);
            // Don't fail the registration if email fails
        });

        // Success - redirect to sign-in page
        res.status(200).json({
            success: true,
            redirect: "/sign-in"
        });

    } catch (error) {
        console.error("Sign up error:", error);
        
        // Don't expose database errors to users
        res.status(500).json({
            error: "An error occurred while creating your account. Please try again later."
        });
    }
}
