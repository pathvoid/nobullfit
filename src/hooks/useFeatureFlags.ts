import { useState, useEffect, useCallback } from "react";

interface FeatureFlag {
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
}

interface UseFeatureFlagsReturn {
    flags: Record<string, boolean>;
    isLoading: boolean;
    error: string | null;
    isEnabled: (flagKey: string) => boolean;
    isIntegrationEnabled: (provider: string) => boolean;
    enabledIntegrations: string[];
    refresh: () => Promise<void>;
}

// Hook for accessing feature flags
const useFeatureFlags = (): UseFeatureFlagsReturn => {
    const [flags, setFlags] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFlags = useCallback(async () => {
        // SSR safety check
        if (typeof window === "undefined") {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch("/api/feature-flags");

            if (!response.ok) {
                throw new Error("Failed to fetch feature flags");
            }

            const data = await response.json();
            const flagMap: Record<string, boolean> = {};

            for (const flag of data.flags as FeatureFlag[]) {
                flagMap[flag.key] = flag.enabled;
            }

            setFlags(flagMap);
        } catch (err) {
            console.error("Error fetching feature flags:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    // Check if a specific flag is enabled
    const isEnabled = useCallback(
        (flagKey: string): boolean => {
            return flags[flagKey] ?? false;
        },
        [flags]
    );

    // Check if a specific integration is enabled
    const isIntegrationEnabled = useCallback(
        (provider: string): boolean => {
            const flagKey = `integration_${provider}`;
            return flags[flagKey] ?? false;
        },
        [flags]
    );

    // Get list of enabled integration providers
    const enabledIntegrations = Object.entries(flags)
        .filter(([key, enabled]) => key.startsWith("integration_") && enabled)
        .map(([key]) => key.replace("integration_", ""));

    return {
        flags,
        isLoading,
        error,
        isEnabled,
        isIntegrationEnabled,
        enabledIntegrations,
        refresh: fetchFlags
    };
};

export default useFeatureFlags;
