import jwt from "jsonwebtoken";

// Centralized JWT configuration - ensures consistent secret usage
// Crash on startup if JWT_SECRET is missing to prevent insecure fallback
if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is not set. Refusing to start with an insecure default.");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || "30d";

// Generate JWT token for user authentication
export function generateToken(userId: number, email: string, remember: boolean = false, tokenVersion: number = 0): string {
    const payload = {
        userId,
        email,
        tokenVersion,
        iat: Math.floor(Date.now() / 1000)
    };

    const expiresIn = remember ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN;

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn,
        algorithm: "HS256"
    } as jwt.SignOptions);
}

// Generate JWT token with custom payload and expiry (for OAuth state, etc.)
export function generateStateToken(payload: Record<string, unknown>, expiresIn: string = "15m"): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn, algorithm: "HS256" } as jwt.SignOptions);
}

// Verify JWT token and return decoded payload (for auth tokens)
export function verifyToken(token: string): { userId: number; email: string; tokenVersion?: number } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as { userId: number; email: string; tokenVersion?: number };
        return decoded;
    } catch (error) {
        // Token invalid or expired. Callers already get `null`; avoid noisy
        // production logs when attackers spray forged tokens.
        if (error instanceof Error && process.env.NODE_ENV !== "production") {
            console.debug("JWT verification error:", error.message);
        }
        return null;
    }
}

// Verify JWT state token and return decoded payload (for OAuth state, etc.)
export function verifyStateToken(token: string): Record<string, unknown> | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as Record<string, unknown>;
        return decoded;
    } catch (error) {
        if (error instanceof Error && process.env.NODE_ENV !== "production") {
            console.debug("JWT state verification error:", error.message);
        }
        return null;
    }
}

// JWT_SECRET is intentionally not exported - all JWT operations should use the functions above
