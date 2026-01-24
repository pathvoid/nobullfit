// Integration provider registry
// Manages all available integration providers

import type { IntegrationProvider, ProviderConfig, DataType } from "./types";

// Provider configurations - metadata for supported integrations
// Currently only Strava is supported
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
    strava: {
        providerKey: "strava",
        providerName: "Strava",
        description: "Import your running, cycling, and other workouts from Strava",
        category: "workout",
        logoUrl: "/images/integrations/strava.svg",
        supportedDataTypes: ["workouts", "calories_burned"],
        oauthScopes: ["read", "activity:read"],
        oauthAuthorizationUrl: "https://www.strava.com/oauth/authorize",
        oauthTokenUrl: "https://www.strava.com/oauth/token",
        requiresPkce: false,
        mobileOnly: false
    }
};

// Provider instances registry
const providerInstances: Map<string, IntegrationProvider> = new Map();

// Register a provider instance
export function registerProvider(provider: IntegrationProvider): void {
    providerInstances.set(provider.config.providerKey, provider);
}

// Get a provider instance by key
export function getProvider(providerKey: string): IntegrationProvider | undefined {
    return providerInstances.get(providerKey);
}

// Get provider config by key
export function getProviderConfig(providerKey: string): ProviderConfig | undefined {
    return PROVIDER_CONFIGS[providerKey];
}

// Get all provider configs
export function getAllProviderConfigs(): ProviderConfig[] {
    return Object.values(PROVIDER_CONFIGS);
}

// Get provider configs by category
export function getProvidersByCategory(category: "wearable" | "workout" | "scale"): ProviderConfig[] {
    return Object.values(PROVIDER_CONFIGS).filter(config => config.category === category);
}

// Get all provider keys
export function getAllProviderKeys(): string[] {
    return Object.keys(PROVIDER_CONFIGS);
}

// Check if a provider key is valid
export function isValidProvider(providerKey: string): boolean {
    return providerKey in PROVIDER_CONFIGS;
}

// Get supported data types for a provider
export function getSupportedDataTypes(providerKey: string): DataType[] {
    const config = PROVIDER_CONFIGS[providerKey];
    return config?.supportedDataTypes ?? [];
}

// Check if a provider is mobile-only
export function isMobileOnlyProvider(providerKey: string): boolean {
    const config = PROVIDER_CONFIGS[providerKey];
    return config?.mobileOnly ?? false;
}

// Get all web-enabled providers (can be connected via web OAuth)
export function getWebEnabledProviders(): ProviderConfig[] {
    return Object.values(PROVIDER_CONFIGS).filter(config => !config.mobileOnly);
}

// Export type for provider keys
export type ProviderKey = keyof typeof PROVIDER_CONFIGS;
