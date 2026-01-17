/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Vite configuration for SSR build
export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Dev server configuration
    server: {
        // Allow external hosts (tunnelmole, ngrok, etc.) for webhook testing
        allowedHosts: ["all"]
    },
    // SSR configuration - specify packages that should be bundled
    ssr: {
        noExternal: [],
        // Mark server-only modules as external to prevent client bundling
            external: ["pg", "bcryptjs", "dotenv", "@aws-sdk/client-ses"]
    },
    // Build configuration
    build: {
        rollupOptions: {
            external: (id) => {
                // Exclude server-only code from client bundle
                if (id.includes("@server/") || id.includes("server/")) {
                    return true;
                }
                return false;
            }
        }
    },
    resolve: {
        // TypeScript path aliases - must match tsconfig.json paths
        alias: {
            "@assets": path.join(__dirname, "./src/assets"),
            "@public": path.join(__dirname, "./public"),
            "@core": path.join(__dirname, "./src/core"),
            "@screens": path.join(__dirname, "./src/screens"),
            "@components": path.join(__dirname, "./src/components"),
            "@utils": path.join(__dirname, "./src/utils"),
            "@hooks": path.join(__dirname, "./src/hooks"),
            "@lib": path.join(__dirname, "./src/lib"),
            "@types": path.join(__dirname, "./src/types"),
            "@client": path.join(__dirname, "./src"),
            "@server": path.join(__dirname, "./server"),
            "@loaders": path.join(__dirname, "./src/loaders")
        }
    },
    // Vitest configuration
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/test/setup.ts",
        css: true
    }
});
