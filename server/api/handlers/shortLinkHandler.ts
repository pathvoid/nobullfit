// Handler for short link redirects
// This handler processes requests to /p/:code and redirects to the original URL

import type { Request, Response } from "express";
import { getOriginalUrl } from "../utils/linkShortenerService.js";

// Handle short link redirect
export async function handleShortLinkRedirect(req: Request, res: Response): Promise<void> {
    const { code } = req.params;

    if (!code || typeof code !== "string") {
        res.status(400).json({ error: "Invalid short link code" });
        return;
    }

    // Validate code format (alphanumeric, reasonable length)
    if (!/^[A-Za-z0-9]{1,20}$/.test(code)) {
        res.status(400).json({ error: "Invalid short link format" });
        return;
    }

    try {
        const originalUrl = await getOriginalUrl(code);

        if (!originalUrl) {
            res.status(404).json({ error: "Short link not found" });
            return;
        }

        // Redirect to the original URL
        res.redirect(302, originalUrl);
    } catch (error) {
        console.error("Error handling short link redirect:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
