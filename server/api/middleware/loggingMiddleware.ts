import type { Request, Response, NextFunction } from "express";
import { logToDb, categorizeAction, extractUserFromRequest } from "../utils/logger.js";

// Query string keys whose values must be redacted before persistence
const SENSITIVE_QUERY_KEY = /^(token|code|secret|password|access_token|refresh_token|key|signature|api_key)$/i;

// Return a shallow copy of the query object with sensitive values masked
function redactQuery(query: Request["query"]): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(query)) {
        redacted[key] = SENSITIVE_QUERY_KEY.test(key) ? "[REDACTED]" : value;
    }
    return redacted;
}

// Logging middleware - intercepts all API requests and logs them to the database
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { userId, userEmail } = extractUserFromRequest(req);

    // Capture the original end method
    const originalEnd = res.end;

    // Override res.end to capture response data
    res.end = function (this: Response, ...args: Parameters<typeof originalEnd>) {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Determine log level based on status code
        let level: "info" | "warn" | "error" = "info";
        if (statusCode >= 500) level = "error";
        else if (statusCode >= 400) level = "warn";

        const action = categorizeAction(req.method, req.path);
        const message = `${req.method} ${req.path} ${statusCode} ${duration}ms`;

        // Get IP address
        const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
            || req.socket.remoteAddress
            || "";

        logToDb({
            level,
            action,
            message,
            userId,
            userEmail,
            method: req.method,
            endpoint: req.path,
            statusCode,
            durationMs: duration,
            ipAddress,
            metadata: {
                query: Object.keys(req.query).length > 0 ? redactQuery(req.query) : undefined,
                userAgent: req.headers["user-agent"],
            },
        });

        // Call original end
        return originalEnd.apply(this, args);
    } as typeof originalEnd;

    next();
}
