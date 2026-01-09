import jwt from "jsonwebtoken";

// Centralized JWT configuration - ensures consistent secret usage
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || "30d";

// Generate JWT token for user
export function generateToken(userId: number, email: string, remember: boolean = false): string {
    const payload = {
        userId,
        email,
        iat: Math.floor(Date.now() / 1000)
    };

    const expiresIn = remember ? JWT_REMEMBER_EXPIRES_IN : JWT_EXPIRES_IN;

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn
    } as jwt.SignOptions);
}

// Verify JWT token and return decoded payload
export function verifyToken(token: string): { userId: number; email: string } | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
        return decoded;
    } catch (error) {
        // Token invalid or expired
        if (error instanceof Error) {
            console.error("JWT verification error:", error.message);
        }
        return null;
    }
}

export { JWT_SECRET };
