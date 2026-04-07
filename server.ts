import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { ViteDevServer } from "vite";

import api from "./server/app.js";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { loggingMiddleware } from "./server/api/middleware/loggingMiddleware.js";
import { startWebhookEventScheduler, stopWebhookEventScheduler } from "./server/api/jobs/webhookEventProcessor.js";

import { startRetentionEmailScheduler, stopRetentionEmailScheduler } from "./server/api/jobs/retentionEmailProcessor.js";
import { ensureWebhookSubscription } from "./server/api/handlers/stravaWebhookHandler.js";
import { handleShortLinkRedirect } from "./server/api/handlers/shortLinkHandler.js";

dotenv.config();
// Get directory name for ES modules (needed because __dirname doesn't exist in ES modules)
const __dirname: string = path.dirname(fileURLToPath(import.meta.url));
const isTest = process.env.VITEST;
const isProd = process.env.NODE_ENV === "production";
const root: string = process.cwd();

// Helper to resolve paths relative to server directory
const resolve = (_path: string) => path.resolve(__dirname, _path);

// Pre-load production HTML template for SSR (only in production)
const indexProd: string = isProd
    ? fs.readFileSync(resolve("client/index.html"), "utf-8")
    : "";

const createServer = async () => {
    const app = express();

    // Hide Express from response headers to reduce fingerprinting
    app.disable("x-powered-by");

    // Trust proxy headers when behind nginx/reverse proxy (required for secure cookies)
    if (isProd) {
        app.set("trust proxy", 1);
    }

    // Parse request bodies for form submissions with size limits to prevent DoS
    app.use(express.urlencoded({ extended: true, limit: "1mb" }));
    // Paddle webhook needs raw body for signature verification
    app.use("/api/paddle/webhook", express.json({
        limit: "1mb",
        verify: (req: Request, res, buf) => {
            (req as Request & { rawBody?: string }).rawBody = buf.toString();
        }
    }));
    app.use(express.json({ limit: "1mb" }));
    // Parse cookies
    app.use(cookieParser());

    // Security headers to prevent clickjacking, MIME sniffing, and enforce HTTPS
    app.use((_req, res, next) => {
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("X-XSS-Protection", "0");
        // CSP provides defense-in-depth against XSS attacks
        // Development needs unsafe-inline/eval for Vite HMR and React refresh
        if (isProd) {
            res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.paddle.com https://static.cloudflareinsights.com https://*.stripe.network https://*.localizecdn.com; style-src 'self' 'unsafe-inline' https://cdn.paddle.com https://fonts.googleapis.com; img-src 'self' https://cdn.nobull.fit https://cdn.paddle.com data:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.paddle.com https://checkout-analytics.paddle.com https://checkout-service.paddle.com https://*.stripe.com https://*.stripe.network https://*.localizecdn.com https://*.ingest.sentry.io https://cloudflareinsights.com; frame-src https://buy.paddle.com https://sandbox-buy.paddle.com https://*.stripe.com https://*.stripe.network;");
        }
        if (isProd) {
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }
        next();
    });

    // Allow cross-origin requests from Expo dev server in development
    if (!isProd) {
        app.use("/api", (req, res, next) => {
            res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.header("Access-Control-Allow-Credentials", "true");
            if (req.method === "OPTIONS") {
                res.sendStatus(204);
                return;
            }
            next();
        });
    }

    // Rate limiting for auth endpoints to prevent brute-force attacks
    const authRateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 attempts per window
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Too many attempts. Please try again later." }
    });
    app.use("/api/sign-in", authRateLimiter);
    app.use("/api/sign-up", authRateLimiter);
    app.use("/api/forgot-password", authRateLimiter);
    app.use("/api/reset-password", authRateLimiter);

    // Log all API requests to the database
    app.use("/api", loggingMiddleware);

    // Mount API routes BEFORE Vite middleware so API requests are handled by Express
    // This is critical for webhooks (like Paddle) that won't have allowed host headers
    app.use("/api", api.router);

    // Short link redirect handler (for SMS and other scenarios)
    app.get("/p/:code", handleShortLinkRedirect);

    // Block admin panel routes in production
    if (isProd) {
        app.use("/admin", (_req, res) => {
            res.status(404).send("Not found");
        });
    }

    let vite: ViteDevServer | undefined;

    // Initialize Vite dev server in development mode
    if (!isProd) {
        vite = await (await import("vite")).createServer({
            root,
            logLevel: isTest ? "error" : "info",
            server: {
                middlewareMode: true,
                // Use polling for file watching (better compatibility on Windows)
                watch: {
                    usePolling: true,
                    interval: 100
                }
            },
            appType: "custom"
        });

        // Use Vite's middleware to handle dev server requests
        app.use(vite.middlewares);
    }

    if (isProd) {
        // Enable gzip compression for production
        const compressionModule = await import("compression");
        // compression is a CommonJS module, handle both default and namespace exports
        const compressionFn = (compressionModule.default || compressionModule) as () => express.RequestHandler;
        app.use(compressionFn());

        // Serve static files from client build directory
        app.use(
            (await import("serve-static")).default(resolve("./client"), {
                index: false
            })
        );
    }

    // SSR route handler - catches all non-API routes
    app.use(/.*/, async (req: Request, res: Response) => {
        // Skip API routes
        if (req.path.startsWith("/api")) {
            return;
        }

        try {
            const url = req.originalUrl;

            let template, render;

            // In development, use Vite's SSR capabilities
            let cssLinks = "";
            if (!isProd && vite) {
                template = fs.readFileSync(resolve("index.html"), "utf8");
                // Load SSR entry module first to process CSS imports
                const ssrModule = await vite.ssrLoadModule("/src/entry-server.tsx");
                render = ssrModule.default.render;
                
                // Extract CSS from Vite's module graph
                // CSS files imported in entry-server.tsx are processed by Vite
                const cssModules: string[] = [];
                vite.moduleGraph.idToModuleMap.forEach((module, id) => {
                    if ((id.endsWith(".css") || id.endsWith(".scss")) && module.url) {
                        cssModules.push(module.url);
                    }
                });
                
                // Create CSS link tags - use absolute URLs for Vite dev server
                cssLinks = cssModules
                    .map((cssUrl) => `<link rel="stylesheet" href="${cssUrl}" />`)
                    .join("\n    ");
                
                // Transform HTML template with Vite (injects HMR scripts, etc.)
                template = await vite.transformIndexHtml(url, template);
            } else {
                // In production, use pre-loaded template and compiled entry
                template = indexProd;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                render = (await import("../entry/entry-server.js")).default.render;
                // In production, CSS is already bundled - Vite will inject it via transformIndexHtml
            }

            // Context for handling redirects from React Router
            interface RedirectContext {
                url?: string;
            }
            const context: RedirectContext = {};
            
            // Render React app to HTML string or handle action response
            const result = await render(req);
            
            // If result is a Response (from action), handle it directly
            if (result instanceof Response) {
                // Handle redirects
                if (result.status >= 300 && result.status < 400) {
                    const location = result.headers.get("Location");
                    if (location) {
                        return res.redirect(result.status, location);
                    }
                }
                // Handle other responses (like JSON error responses from actions)
                const contentType = result.headers.get("Content-Type") || "text/html";
                res.status(result.status).set("Content-Type", contentType);
                const body = await result.text();
                return res.send(body);
            }
            
            const appHtml = result;
            const { helmet } = appHtml;

            // Handle redirects from React Router loaders
            if (context.url) return res.redirect(301, context.url);

            // Inject rendered HTML into template
            let html = template.replace("<!--app-html-->", appHtml.html);

            // Inject helmet meta tags and CSS into head section
            html = html.replace("<!--app-head-->", [
                cssLinks,
                helmet.title.toString(),
                helmet.meta.toString(),
                helmet.link.toString(),
                helmet.style.toString()
            ].filter(Boolean).join("\n    "));
            // Inject scripts before closing body tag
            html = html.replace("<!--app-scripts-->", helmet.script.toString());

            // Prevent browser from caching authenticated pages so back-button after logout shows nothing
            const headers: Record<string, string> = { "Content-Type": "text/html" };
            if (req.path.startsWith("/dashboard") || req.path.startsWith("/admin")) {
                headers["Cache-Control"] = "no-store";
            }

            res.status(200).set(headers).end(html);

        } catch (e) {
            // Handle redirects from React Router loaders/actions
            if (e instanceof Response) {
                if (e.status >= 300 && e.status < 400) {
                    const location = e.headers.get("Location");
                    if (location) {
                        return res.redirect(e.status, location);
                    }
                }
                // If it's a Response but not a redirect, send it as-is
                return res.status(e.status).set(Object.fromEntries(e.headers.entries())).send(e.body);
            }
            // Error handling for SSR failures
            if (e instanceof Error) {
                // Fix stack traces in development (Vite needs to map source locations)
                !isProd && vite && vite.ssrFixStacktrace(e);
                console.error(e.stack);
                // Never expose stack traces to clients in production
                res.status(500).end(isProd ? "Internal Server Error" : e.stack);
            } else {
                console.error(e);
                res.status(500).end("Internal Server Error");
            }
        }
    });

    return { app, vite };
};

// Start server (skip in test environment)
if (!isTest) {
    createServer().then(async ({ app }) => {
        // Start webhook event processor (runs every 30 seconds)
        const webhookProcessorId = startWebhookEventScheduler(30);

        // Start retention email processor (runs every 24 hours)
        const retentionProcessorId = startRetentionEmailScheduler(86400);

        const server = app.listen(process.env.PORT || 3000, async () => {
            console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
            console.log("[WebhookProcessor] Scheduler started (interval: 30 seconds)");

            console.log("[RetentionEmailProcessor] Scheduler started (interval: 24 hours)");

            // Auto-setup Strava webhook subscription in production
            // Must run AFTER server is listening so Strava's validation callback can reach us
            if (isProd) {
                // Small delay to ensure server is fully ready
                setTimeout(async () => {
                    await ensureWebhookSubscription();
                }, 2000);
            }
        });

        // Graceful shutdown
        process.on("SIGTERM", () => {
            console.log("SIGTERM received, shutting down gracefully...");
            stopWebhookEventScheduler(webhookProcessorId);

            stopRetentionEmailScheduler(retentionProcessorId);
            server.close(() => {
                console.log("Server closed");
                process.exit(0);
            });
        });
    });
}