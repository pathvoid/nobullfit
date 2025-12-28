import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { ViteDevServer } from "vite";

import api from "./server/app.js";
import cookieParser from "cookie-parser";

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

    // Parse request bodies for form submissions
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    // Parse cookies
    app.use(cookieParser());

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

    // Mount API routes
    app.use("/api", api.router);

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

            res.status(200).set({ "Content-Type": "text/html" }).end(html);

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
                console.log(e.stack);
                res.status(500).end(e.stack);
            } else {
                console.log(e);
                res.status(500).end("Unknown error");
            }
        }
    });

    return { app, vite };
};

// Start server (skip in test environment)
if (!isTest) {
    createServer().then(({ app }) => {
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
        });
    });
}