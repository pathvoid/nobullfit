import getPool from "../../db/connection.js";
import crypto from "crypto";

// Characters used for generating short codes (URL-safe, excluding ambiguous characters)
const CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

// Generate a random short code
function generateCode(): string {
    const bytes = crypto.randomBytes(CODE_LENGTH);
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_CHARACTERS[bytes[i] % CODE_CHARACTERS.length];
    }
    return code;
}

// Normalize URL to ensure consistent matching
// Removes trailing slashes (except for root) and lowercases the path
export function normalizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Remove trailing slash from pathname (but keep root "/" as is)
        let normalizedPath = parsed.pathname;
        if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
            normalizedPath = normalizedPath.slice(0, -1);
        }
        // Rebuild URL with normalized path, keep query params and hash
        return `${parsed.origin}${normalizedPath}${parsed.search}${parsed.hash}`;
    } catch {
        // If URL parsing fails, just normalize trailing slashes
        let normalized = url;
        // Remove trailing slash unless it's just "/"
        if (normalized.length > 1 && normalized.endsWith("/")) {
            normalized = normalized.slice(0, -1);
        }
        return normalized;
    }
}

// Shorten a URL - returns existing short link if one exists, otherwise creates a new one
export async function shortenUrl(originalUrl: string): Promise<{ code: string; shortUrl: string } | null> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database pool not available for link shortening");
        return null;
    }

    const normalizedUrl = normalizeUrl(originalUrl);

    try {
        // Check if a short link already exists for this normalized URL
        const existingResult = await pool.query(
            "SELECT code FROM short_links WHERE normalized_url = $1",
            [normalizedUrl]
        );

        if (existingResult.rows.length > 0) {
            const code = existingResult.rows[0].code;
            return {
                code,
                shortUrl: `https://nobull.fit/p/${code}`
            };
        }

        // Generate a unique code (retry if collision occurs)
        let code: string;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            code = generateCode();
            try {
                await pool.query(
                    `INSERT INTO short_links (code, original_url, normalized_url)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (normalized_url) DO NOTHING`,
                    [code, originalUrl, normalizedUrl]
                );

                // Check if our insert succeeded or if another process created a link first
                const checkResult = await pool.query(
                    "SELECT code FROM short_links WHERE normalized_url = $1",
                    [normalizedUrl]
                );

                if (checkResult.rows.length > 0) {
                    const finalCode = checkResult.rows[0].code;
                    return {
                        code: finalCode,
                        shortUrl: `https://nobull.fit/p/${finalCode}`
                    };
                }
            } catch (error) {
                // If it's a unique constraint violation on code, retry with new code
                const pgError = error as { code?: string };
                if (pgError.code === "23505") {
                    attempts++;
                    continue;
                }
                throw error;
            }
            attempts++;
        }

        console.error("Failed to generate unique short code after max attempts");
        return null;
    } catch (error) {
        console.error("Error shortening URL:", error);
        return null;
    }
}

// Get the original URL for a short code and optionally increment click count
export async function getOriginalUrl(code: string, incrementClicks: boolean = true): Promise<string | null> {
    const pool = await getPool();
    if (!pool) {
        console.error("Database pool not available for link lookup");
        return null;
    }

    try {
        if (incrementClicks) {
            // Update click count and return the URL in a single query
            const result = await pool.query(
                `UPDATE short_links
                 SET click_count = click_count + 1, updated_at = CURRENT_TIMESTAMP
                 WHERE code = $1
                 RETURNING original_url`,
                [code]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0].original_url;
        } else {
            // Just retrieve the URL without incrementing
            const result = await pool.query(
                "SELECT original_url FROM short_links WHERE code = $1",
                [code]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0].original_url;
        }
    } catch (error) {
        console.error("Error retrieving original URL:", error);
        return null;
    }
}

// Get short link statistics (for internal use)
export async function getShortLinkStats(code: string): Promise<{
    code: string;
    originalUrl: string;
    clickCount: number;
    createdAt: Date;
} | null> {
    const pool = await getPool();
    if (!pool) {
        return null;
    }

    try {
        const result = await pool.query(
            "SELECT code, original_url, click_count, created_at FROM short_links WHERE code = $1",
            [code]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            code: row.code,
            originalUrl: row.original_url,
            clickCount: row.click_count,
            createdAt: row.created_at
        };
    } catch (error) {
        console.error("Error retrieving short link stats:", error);
        return null;
    }
}
