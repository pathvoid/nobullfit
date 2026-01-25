// Feature flags API handler
// Provides endpoints for querying feature flags

import type { Request, Response } from "express";
import {
    getAllFlags,
    getEnabledFlags,
    getIntegrationFlags,
    getEnabledIntegrationProviders
} from "../utils/featureFlagService.js";

// Get all feature flags (public endpoint, cached)
export async function handleGetFeatureFlags(req: Request, res: Response): Promise<void> {
    try {
        const flags = await getAllFlags();

        // Return only the essential info for each flag
        const flagsResponse = flags.map(flag => ({
            key: flag.flag_key,
            name: flag.flag_name,
            description: flag.description,
            enabled: flag.is_enabled
        }));

        // Set cache headers for 1 minute
        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ flags: flagsResponse });
    } catch (error) {
        console.error("Error fetching feature flags:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get enabled feature flags only
export async function handleGetEnabledFlags(req: Request, res: Response): Promise<void> {
    try {
        const flags = await getEnabledFlags();

        const flagKeys = flags.map(flag => flag.flag_key);

        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ enabledFlags: flagKeys });
    } catch (error) {
        console.error("Error fetching enabled feature flags:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get integration feature flags
export async function handleGetIntegrationFlags(req: Request, res: Response): Promise<void> {
    try {
        const flags = await getIntegrationFlags();

        const integrationFlags = flags.map(flag => ({
            key: flag.flag_key,
            provider: flag.flag_key.replace("integration_", ""),
            name: flag.flag_name,
            description: flag.description,
            enabled: flag.is_enabled
        }));

        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ integrations: integrationFlags });
    } catch (error) {
        console.error("Error fetching integration flags:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get enabled integration providers (just the provider keys)
export async function handleGetEnabledIntegrations(req: Request, res: Response): Promise<void> {
    try {
        const providers = await getEnabledIntegrationProviders();

        res.setHeader("Cache-Control", "public, max-age=60");
        res.status(200).json({ enabledProviders: providers });
    } catch (error) {
        console.error("Error fetching enabled integrations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
