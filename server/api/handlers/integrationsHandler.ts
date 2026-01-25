// Integrations API handler
// Manages health and fitness integration connections

import type { Request, Response } from "express";
import crypto from "crypto";
import getPool from "../../db/connection";
import { verifyToken, generateStateToken, verifyStateToken } from "../utils/jwt";
import { encryptToken } from "../utils/encryptionService";
import { isIntegrationEnabled } from "../utils/featureFlagService";
import {
    getAllProviderConfigs,
    getProviderConfig,
    isValidProvider
} from "../utils/integrationProviders";
import type { IntegrationInfo, ConnectionStatus } from "../utils/integrationProviders/types";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

// Helper to get user ID from request
async function getUserIdFromRequest(req: Request): Promise<number | null> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "") || req.cookies?.auth_token;

    if (!token) {
        return null;
    }

    const decoded = verifyToken(token);
    if (!decoded || typeof decoded !== "object" || !("userId" in decoded)) {
        return null;
    }

    return decoded.userId as number;
}

// Helper to check if user is a Pro subscriber
async function isProUser(userId: number): Promise<boolean> {
    const pool = await getPool();
    if (!pool) return false;

    const result = await pool.query(
        "SELECT subscribed FROM users WHERE id = $1",
        [userId]
    );

    return result.rows[0]?.subscribed === true;
}

// Get all integrations with their status
export async function handleGetIntegrations(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Get all provider configs
        const allProviders = getAllProviderConfigs();

        // Get user's connections
        const connectionsResult = await pool.query(
            `SELECT provider, status, last_sync_at, last_successful_sync_at, provider_user_id
             FROM integration_connections
             WHERE user_id = $1`,
            [userId]
        );

        const connectionsMap = new Map(
            connectionsResult.rows.map(row => [row.provider, row])
        );

        // Build integration info for each provider
        const integrations: IntegrationInfo[] = await Promise.all(
            allProviders.map(async (config) => {
                const isEnabled = await isIntegrationEnabled(config.providerKey);
                const connection = connectionsMap.get(config.providerKey);

                return {
                    provider: config.providerKey,
                    providerName: config.providerName,
                    description: config.description,
                    category: config.category,
                    logoUrl: config.logoUrl,
                    supportedDataTypes: config.supportedDataTypes,
                    isEnabled,
                    isConnected: connection?.status === "active",
                    connectionStatus: connection?.status as ConnectionStatus | undefined,
                    lastSyncAt: connection?.last_sync_at?.toISOString(),
                    lastSuccessfulSyncAt: connection?.last_successful_sync_at?.toISOString(),
                    providerUserId: connection?.provider_user_id,
                    mobileOnly: config.mobileOnly
                };
            })
        );

        // Group by category
        const grouped = {
            wearable: integrations.filter(i => i.category === "wearable"),
            workout: integrations.filter(i => i.category === "workout"),
            scale: integrations.filter(i => i.category === "scale")
        };

        // Check if any integration is enabled
        const anyEnabled = integrations.some(i => i.isEnabled);

        res.status(200).json({
            integrations,
            grouped,
            anyEnabled
        });
    } catch (error) {
        console.error("Error fetching integrations:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get specific integration details
export async function handleGetIntegration(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const provider = req.params.provider as string;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        const config = getProviderConfig(provider);
        if (!config) {
            res.status(404).json({ error: "Provider not found" });
            return;
        }

        const isEnabled = await isIntegrationEnabled(provider);

        // Get connection if exists
        const connectionResult = await pool.query(
            `SELECT status, last_sync_at, last_successful_sync_at, provider_user_id, scopes, last_error, connected_at
             FROM integration_connections
             WHERE user_id = $1 AND provider = $2`,
            [userId, provider]
        );

        const connection = connectionResult.rows[0];

        // Get auto-sync settings if user is Pro
        let autoSync = null;
        if (await isProUser(userId)) {
            const autoSyncResult = await pool.query(
                `SELECT is_enabled, sync_frequency_minutes, sync_data_types, consecutive_failures,
                        last_failure_at, last_failure_reason, disabled_due_to_failure
                 FROM integration_auto_sync
                 WHERE user_id = $1 AND provider = $2`,
                [userId, provider]
            );
            autoSync = autoSyncResult.rows[0] || null;
        }

        res.status(200).json({
            provider: config.providerKey,
            providerName: config.providerName,
            description: config.description,
            category: config.category,
            logoUrl: config.logoUrl,
            supportedDataTypes: config.supportedDataTypes,
            isEnabled,
            mobileOnly: config.mobileOnly,
            connection: connection ? {
                status: connection.status,
                lastSyncAt: connection.last_sync_at?.toISOString(),
                lastSuccessfulSyncAt: connection.last_successful_sync_at?.toISOString(),
                providerUserId: connection.provider_user_id,
                scopes: connection.scopes,
                lastError: connection.last_error,
                connectedAt: connection.connected_at?.toISOString()
            } : null,
            autoSync: autoSync ? {
                isEnabled: autoSync.is_enabled,
                frequencyMinutes: autoSync.sync_frequency_minutes,
                dataTypes: autoSync.sync_data_types,
                consecutiveFailures: autoSync.consecutive_failures,
                lastFailureAt: autoSync.last_failure_at?.toISOString(),
                lastFailureReason: autoSync.last_failure_reason,
                disabledDueToFailure: autoSync.disabled_due_to_failure
            } : null
        });
    } catch (error) {
        console.error("Error fetching integration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Initiate OAuth connection
export async function handleConnectIntegration(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const provider = req.params.provider as string;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        // Check if integration is enabled via feature flag
        const isEnabled = await isIntegrationEnabled(provider);
        if (!isEnabled) {
            res.status(403).json({ error: "This integration is currently not available" });
            return;
        }

        const config = getProviderConfig(provider);
        if (!config) {
            res.status(404).json({ error: "Provider not found" });
            return;
        }

        // Mobile-only providers cannot be connected via web
        if (config.mobileOnly) {
            res.status(400).json({
                error: "This integration requires the mobile app",
                mobileOnly: true
            });
            return;
        }

        // Validate OAuth credentials are configured
        const clientId = getClientId(provider);
        const clientSecret = getClientSecret(provider);

        if (!clientId || !clientSecret) {
            console.error(`OAuth credentials not configured for provider: ${provider}`);
            res.status(503).json({
                error: "This integration is not properly configured. Please contact support."
            });
            return;
        }

        // Generate state token for OAuth CSRF protection
        const statePayload = {
            userId,
            provider,
            nonce: crypto.randomBytes(16).toString("hex"),
            timestamp: Date.now()
        };
        const state = generateStateToken(statePayload, "15m"); // 15 minute expiry

        // Generate PKCE code verifier if required
        let codeVerifier: string | undefined;
        let codeChallenge: string | undefined;

        if (config.requiresPkce) {
            codeVerifier = crypto.randomBytes(32).toString("base64url");
            codeChallenge = crypto
                .createHash("sha256")
                .update(codeVerifier)
                .digest("base64url");

            // Store code verifier in session/cache (for now, include in state)
            // In production, use Redis or similar for better security
        }

        const redirectUri = `${APP_URL}/api/integrations/oauth/callback/${provider}`;

        // Build authorization URL using already-validated clientId
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: config.oauthScopes.join(","),
            state
        });

        if (codeChallenge) {
            params.set("code_challenge", codeChallenge);
            params.set("code_challenge_method", "S256");
        }

        const authUrl = `${config.oauthAuthorizationUrl}?${params.toString()}`;

        res.status(200).json({
            authUrl,
            codeVerifier // Frontend should store this temporarily for the callback
        });
    } catch (error) {
        console.error("Error initiating integration connection:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// OAuth callback handler
export async function handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
        const provider = req.params.provider as string;
        const { code, state, error: oauthError } = req.query;

        if (oauthError) {
            // OAuth error from provider
            res.redirect(`${APP_URL}/dashboard/integrations?error=oauth_denied&provider=${provider}`);
            return;
        }

        if (!code || !state) {
            res.redirect(`${APP_URL}/dashboard/integrations?error=invalid_callback&provider=${provider}`);
            return;
        }

        // Verify state token
        const statePayload = verifyStateToken(state as string);
        if (!statePayload || typeof statePayload !== "object") {
            res.redirect(`${APP_URL}/dashboard/integrations?error=invalid_state&provider=${provider}`);
            return;
        }

        const { userId, provider: stateProvider, timestamp } = statePayload as {
            userId: number;
            provider: string;
            timestamp: number;
        };

        // Validate state
        if (stateProvider !== provider) {
            res.redirect(`${APP_URL}/dashboard/integrations?error=state_mismatch&provider=${provider}`);
            return;
        }

        // Check if state is expired (15 minutes)
        if (Date.now() - timestamp > 15 * 60 * 1000) {
            res.redirect(`${APP_URL}/dashboard/integrations?error=state_expired&provider=${provider}`);
            return;
        }

        const config = getProviderConfig(provider);
        if (!config) {
            res.redirect(`${APP_URL}/dashboard/integrations?error=invalid_provider&provider=${provider}`);
            return;
        }

        // Exchange code for tokens
        const redirectUri = `${APP_URL}/api/integrations/oauth/callback/${provider}`;
        const tokenData = await exchangeCodeForTokens(provider, code as string, redirectUri);

        if (!tokenData) {
            res.redirect(`${APP_URL}/dashboard/integrations?error=token_exchange_failed&provider=${provider}`);
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.redirect(`${APP_URL}/dashboard/integrations?error=database_error&provider=${provider}`);
            return;
        }

        // Encrypt tokens
        const accessTokenEncrypted = encryptToken(tokenData.accessToken);
        const refreshTokenEncrypted = tokenData.refreshToken
            ? encryptToken(tokenData.refreshToken)
            : null;

        // Get user info from provider
        const userInfo = await getProviderUserInfo(provider, tokenData.accessToken);

        // Upsert connection
        await pool.query(
            `INSERT INTO integration_connections
             (user_id, provider, access_token_encrypted, refresh_token_encrypted, token_expires_at,
              provider_user_id, scopes, status, connected_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, provider)
             DO UPDATE SET
                access_token_encrypted = EXCLUDED.access_token_encrypted,
                refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                token_expires_at = EXCLUDED.token_expires_at,
                provider_user_id = EXCLUDED.provider_user_id,
                scopes = EXCLUDED.scopes,
                status = 'active',
                last_error = NULL,
                updated_at = CURRENT_TIMESTAMP`,
            [
                userId,
                provider,
                accessTokenEncrypted,
                refreshTokenEncrypted,
                tokenData.expiresAt,
                userInfo?.providerId,
                JSON.stringify(tokenData.scopes || config.oauthScopes)
            ]
        );

        res.redirect(`${APP_URL}/dashboard/integrations?connected=${provider}`);
    } catch (error) {
        console.error("Error in OAuth callback:", error);
        const provider = req.params.provider as string;
        res.redirect(`${APP_URL}/dashboard/integrations?error=callback_error&provider=${provider}`);
    }
}

// Disconnect integration
export async function handleDisconnectIntegration(req: Request, res: Response): Promise<void> {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const provider = req.params.provider as string;

        if (!isValidProvider(provider)) {
            res.status(400).json({ error: "Invalid provider" });
            return;
        }

        const pool = await getPool();
        if (!pool) {
            res.status(500).json({ error: "Database connection not available" });
            return;
        }

        // Delete connection
        const result = await pool.query(
            "DELETE FROM integration_connections WHERE user_id = $1 AND provider = $2 RETURNING id",
            [userId, provider]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: "Connection not found" });
            return;
        }

        // Also delete auto-sync settings
        await pool.query(
            "DELETE FROM integration_auto_sync WHERE user_id = $1 AND provider = $2",
            [userId, provider]
        );

        res.status(200).json({ success: true, message: "Integration disconnected" });
    } catch (error) {
        console.error("Error disconnecting integration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Helper to get client ID for a provider
function getClientId(provider: string): string {
    const envVar = `${provider.toUpperCase()}_CLIENT_ID`;
    return process.env[envVar] || "";
}

// Helper to get client secret for a provider
function getClientSecret(provider: string): string {
    const envVar = `${provider.toUpperCase()}_CLIENT_SECRET`;
    return process.env[envVar] || "";
}

// Exchange authorization code for tokens (provider-specific)
async function exchangeCodeForTokens(
    provider: string,
    code: string,
    redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; scopes?: string[] } | null> {
    const config = getProviderConfig(provider);
    if (!config) return null;

    const clientId = getClientId(provider);
    const clientSecret = getClientSecret(provider);

    if (!clientId || !clientSecret) {
        console.error(`Missing credentials for provider: ${provider}`);
        return null;
    }

    try {
        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: redirectUri
        });

        const response = await fetch(config.oauthTokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Token exchange failed for ${provider}:`, errorText);
            return null;
        }

        const data = await response.json();

        // Handle different response formats
        const accessToken = data.access_token;
        const refreshToken = data.refresh_token;
        const expiresIn = data.expires_in;

        return {
            accessToken,
            refreshToken,
            expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
            scopes: data.scope?.split(" ")
        };
    } catch (error) {
        console.error(`Error exchanging code for ${provider}:`, error);
        return null;
    }
}

// Get user info from Strava
async function getProviderUserInfo(
    provider: string,
    accessToken: string
): Promise<{ providerId: string; email?: string; name?: string } | null> {
    // Only Strava is currently supported
    if (provider !== "strava") {
        return null;
    }

    try {
        const response = await fetch("https://www.strava.com/api/v3/athlete", {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error(`Strava athlete API returned ${response.status}`);
            return null;
        }

        const data = await response.json();

        return {
            providerId: String(data.id),
            email: data.email,
            name: `${data.firstname || ""} ${data.lastname || ""}`.trim() || undefined
        };
    } catch (error) {
        console.error("Error getting Strava user info:", error);
        return null;
    }
}
