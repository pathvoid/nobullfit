import type * as express from "express";
import ReactDomServer from "react-dom/server";
import { StaticRouterProvider, createStaticHandler, createStaticRouter } from "react-router-dom";
import App from "./App";
import routes from "@core/routes";
import type { HelmetValues, MetaTag, LinkTag, ScriptTag } from "./types/helmet";

// Import CSS so Vite processes it during SSR
import "@assets/styles/tailwind.css";
import "@assets/styles/index.scss";

// Server-side render function - converts Express request to HTML string
const render = async (req: express.Request) => {
    // Create static handler for React Router SSR
    const handler = createStaticHandler(routes);
    // Convert Express request to Fetch API Request (React Router expects Fetch API)
    const remixRequest = createFetchRequest(req);
    
    // Handle POST requests (form submissions) with actions, GET requests with loaders
    let context;
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
        // Execute action for form submissions
        context = await handler.query(remixRequest, { requestContext: { action: true } });
    } else {
        // Execute loader for GET requests
        context = await handler.query(remixRequest);
    }
    
    const { dataRoutes } = handler;

    // If context is a Response, it's a redirect - throw to handle upstream
    if (context instanceof Response) {
        throw context;
    }

    // Create static router for SSR
    const router = createStaticRouter(dataRoutes, context);

    // Extract helmet data from loader data (loaders run on both server and client)
    let helmetValues: HelmetValues = {
        title: "NoBullFit",
        meta: [],
        link: [],
        script: [],
        style: ""
    };

    // Extract title and meta tags from loader data if available
    if (context.loaderData) {
        const loaderDataEntries = Object.values(context.loaderData);
        for (const data of loaderDataEntries) {
            if (data && typeof data === "object" && "title" in data) {
                const loaderData = data as { title?: string; meta?: MetaTag[] };
                if (loaderData.title) {
                    helmetValues.title = loaderData.title;
                }
                if (loaderData.meta && Array.isArray(loaderData.meta)) {
                    helmetValues.meta = loaderData.meta;
                }
            }
        }
    }

    // Render React app to HTML string
    const html = ReactDomServer.renderToString(
        <App onHelmetChange={(helmet) => { 
            // Capture helmet values set by components during render
            helmetValues = helmet; 
        }}>
            <StaticRouterProvider
                router={router}
                context={context}
                nonce='the-nonce'
            />
        </App>
    );

    // Helper function to convert attributes object to HTML attribute string
    const createAttributes = (attrs: Record<string, unknown>): string => {
        return Object.entries(attrs)
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => {
                const value = Array.isArray(v) ? v.join(" ") : String(v);
                // Escape quotes in attribute values
                return `${k}="${value.replace(/"/g, "&quot;")}"`;
            })
            .join(" ");
    };

    // Create helmet object with toString methods for injecting into HTML template
    const helmet = {
        title: { toString: () => `<title>${helmetValues.title}</title>` },
        meta: { toString: () => helmetValues.meta.map((m: MetaTag) => `<meta ${createAttributes(m as Record<string, unknown>)} />`).join("") },
        link: { toString: () => helmetValues.link.map((l: LinkTag) => `<link ${createAttributes(l as Record<string, unknown>)} />`).join("") },
        script: { 
            toString: () => helmetValues.script.map((s: ScriptTag) => {
                const { children, ...attrs } = s;
                const attrsStr = createAttributes(attrs);
                // Handle inline scripts (with children) vs external scripts
                return children 
                    ? `<script${attrsStr ? " " + attrsStr : ""}>${children}</script>`
                    : `<script ${attrsStr} />`;
            }).join("") 
        },
        style: { 
            toString: () => typeof helmetValues.style === "string" 
                ? `<style>${helmetValues.style}</style>` 
                : Array.isArray(helmetValues.style) 
                    ? helmetValues.style.map((s: string) => `<style>${s}</style>`).join("")
                    : ""
        }
    };

    return { html, helmet };
};

// Convert Express request to Fetch API Request (required by React Router)
export function createFetchRequest(req: express.Request): Request {
    const origin = `${req.protocol}://${req.get("host")}`;
    // Use originalUrl to handle Vite proxy rewrites correctly
    const url = new URL(req.originalUrl || req.url, origin);

    // Create abort controller to handle client disconnections
    const controller = new AbortController();
    req.on("close", () => controller.abort());

    // Convert Express headers to Fetch Headers
    const headers = new Headers();
    for (const [key, values] of Object.entries(req.headers)) {
        if (values) {
            if (Array.isArray(values)) {
                // Multiple values for same header - append each
                for (const value of values) {
                    headers.append(key, value);
                }
            } else {
                headers.set(key, values);
            }
        }
    }

    const init: RequestInit = {
        method: req.method,
        headers,
        signal: controller.signal
    };

    // Include body for non-GET/HEAD requests
    if (req.method !== "GET" && req.method !== "HEAD") {
        // For form submissions, Express parses urlencoded bodies automatically
        // We need to convert it to FormData format for React Router
        if (req.headers["content-type"]?.includes("application/x-www-form-urlencoded")) {
            const formData = new URLSearchParams();
            if (req.body && typeof req.body === "object") {
                for (const [key, value] of Object.entries(req.body)) {
                    if (value !== undefined && value !== null) {
                        formData.append(key, String(value));
                    }
                }
            }
            init.body = formData.toString();
        } else if (req.body) {
            init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        }
    }

    return new Request(url.href, init);
}

const _export = {
    render,
    createFetchRequest
};

export default _export;
