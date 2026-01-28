import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from "@components/dialog";
import { Badge } from "@components/badge";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { useAuth } from "@core/contexts/AuthContext";
import { toast } from "sonner";
import { RefreshCw, Unlink, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

// Integration info from API
interface IntegrationInfo {
    provider: string;
    providerName: string;
    description: string;
    category: "wearable" | "workout" | "scale";
    logoUrl: string;
    supportedDataTypes: string[];
    isEnabled: boolean;
    isConnected: boolean;
    connectionStatus?: "active" | "disconnected" | "expired" | "error";
    lastSyncAt?: string;
    lastSuccessfulSyncAt?: string;
    providerUserId?: string;
    mobileOnly: boolean;
}

interface IntegrationsResponse {
    integrations: IntegrationInfo[];
    grouped: {
        wearable: IntegrationInfo[];
        workout: IntegrationInfo[];
        scale: IntegrationInfo[];
    };
    anyEnabled: boolean;
}


const Integrations: React.FC = () => {
    const loaderData = useLoaderData() as { title?: string; meta?: unknown[]; user?: { subscribed?: boolean } } | undefined;
    const helmet = useHelmet();
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [integrations, setIntegrations] = useState<IntegrationsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [disconnectDialog, setDisconnectDialog] = useState<{ open: boolean; provider: string; name: string }>({
        open: false,
        provider: "",
        name: ""
    });

    // Set helmet values
    if (loaderData?.title) {
        helmet.setTitle(loaderData.title);
    }
    if (loaderData?.meta) {
        helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);
    }

    // Auth redirect
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/sign-in?redirect=/dashboard/integrations");
        }
    }, [user, authLoading, navigate]);

    // Handle connection success/error from OAuth callback
    useEffect(() => {
        const connected = searchParams.get("connected");
        const errorParam = searchParams.get("error");

        if (connected) {
            toast.success(`Successfully connected to ${connected.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}`);
            setSearchParams({});
            fetchIntegrations();
        } else if (errorParam) {
            const errorMessages: Record<string, string> = {
                oauth_denied: "Connection was denied. Please try again.",
                invalid_callback: "Invalid callback. Please try connecting again.",
                invalid_state: "Security validation failed. Please try again.",
                state_mismatch: "Security validation failed. Please try again.",
                state_expired: "Connection request expired. Please try again.",
                token_exchange_failed: "Failed to complete connection. Please try again.",
                callback_error: "An error occurred. Please try again.",
                database_error: "A server error occurred. Please try again.",
                invalid_provider: "Invalid integration provider."
            };
            toast.error(errorMessages[errorParam] || "Connection failed. Please try again.");
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    // Fetch integrations
    const fetchIntegrations = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch("/api/integrations", {
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to fetch integrations");
            }

            const data: IntegrationsResponse = await response.json();
            setIntegrations(data);
        } catch (err) {
            console.error("Error fetching integrations:", err);
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchIntegrations();
        }
    }, [fetchIntegrations, user]);

    // Handle connect
    const handleConnect = async (provider: string) => {
        try {
            const response = await fetch(`/api/integrations/${provider}/connect`, {
                method: "POST",
                credentials: "include"
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to initiate connection");
            }

            const data = await response.json();
            // Redirect to OAuth provider
            window.location.href = data.authUrl;
        } catch (err) {
            console.error("Error connecting:", err);
            toast.error(err instanceof Error ? err.message : "Failed to connect");
        }
    };

    // Handle disconnect
    const handleDisconnect = async () => {
        try {
            const response = await fetch(`/api/integrations/${disconnectDialog.provider}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to disconnect");
            }

            toast.success(`Disconnected from ${disconnectDialog.name}`);
            setDisconnectDialog({ open: false, provider: "", name: "" });
            fetchIntegrations();
        } catch (err) {
            console.error("Error disconnecting:", err);
            toast.error("Failed to disconnect");
        }
    };

    // Format last sync time
    const formatLastSync = (dateStr?: string) => {
        if (!dateStr) return "Never synced";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    // Get status badge
    const getStatusBadge = (integration: IntegrationInfo) => {
        if (!integration.isConnected) {
            return <Badge color="zinc">Not Connected</Badge>;
        }
        switch (integration.connectionStatus) {
            case "active":
                return <Badge color="green">Connected</Badge>;
            case "expired":
                return <Badge color="yellow">Expired</Badge>;
            case "error":
                return <Badge color="red">Error</Badge>;
            default:
                return <Badge color="zinc">Unknown</Badge>;
        }
    };

    // Get enabled integrations
    const enabledIntegrations = integrations?.integrations.filter(i => i.isEnabled) || [];

    // Render integration card
    const renderIntegrationCard = (integration: IntegrationInfo) => {
        return (
            <div
                key={integration.provider}
                className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-6 dark:border-white/10 dark:bg-zinc-800/50"
            >
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {integration.providerName}
                        </h3>
                        {getStatusBadge(integration)}
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {integration.description}
                    </p>
                </div>

                {integration.isConnected && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                            <Clock className="size-4" />
                            <span>Last sync: {formatLastSync(integration.lastSyncAt)}</span>
                        </div>
                        {integration.providerUserId && (
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-4 text-green-500" />
                                <span>ID: {integration.providerUserId}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    {!integration.isConnected ? (
                        <button
                            onClick={() => handleConnect(integration.provider)}
                            disabled={!integration.isEnabled}
                            className="disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            <img
                                src="https://cdn.nobull.fit/btn_strava_connect_with_orange.png"
                                alt="Connect with Strava"
                                className="h-9"
                            />
                        </button>
                    ) : (
                        <Button
                            plain
                            onClick={() =>
                                setDisconnectDialog({
                                    open: true,
                                    provider: integration.provider,
                                    name: integration.providerName
                                })
                            }
                        >
                            <Unlink className="size-4" data-slot="icon" />
                            Disconnect
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo href="/dashboard" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/integrations" />}
        >
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <Heading level={1}>Health & Fitness Apps</Heading>
                    <Text className="mt-2">
                        Connect your favorite apps to automatically sync your workouts and activities.
                    </Text>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="size-8 animate-spin text-zinc-400" />
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="size-5 text-red-500" />
                            <p className="text-red-700 dark:text-red-400">
                                Failed to load integrations. Please try again.
                            </p>
                        </div>
                        <Button onClick={fetchIntegrations} className="mt-4">
                            Retry
                        </Button>
                    </div>
                )}

                {/* No integrations available fallback */}
                {!isLoading && !error && enabledIntegrations.length === 0 && (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img
                            src="https://cdn.nobull.fit/coconut-apps.png"
                            alt="No integrations"
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            No Integrations Available
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            There are no integrations available at the moment. Check back later!
                        </Text>
                    </div>
                )}

                {/* Integration cards */}
                {!isLoading && !error && enabledIntegrations.length > 0 && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        {enabledIntegrations.map(renderIntegrationCard)}
                    </div>
                )}

            </div>

            {/* Disconnect confirmation dialog */}
            <Dialog open={disconnectDialog.open} onClose={() => setDisconnectDialog({ open: false, provider: "", name: "" })}>
                <DialogTitle>Disconnect {disconnectDialog.name}?</DialogTitle>
                <DialogDescription>
                    This will remove the connection to {disconnectDialog.name}. Your synced data will remain in your account,
                    but no new data will be imported until you reconnect.
                </DialogDescription>
                <DialogBody>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        You can reconnect at any time by clicking the Connect button.
                    </p>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setDisconnectDialog({ open: false, provider: "", name: "" })}>
                        Cancel
                    </Button>
                    <Button color="red" onClick={handleDisconnect}>
                        Disconnect
                    </Button>
                </DialogActions>
            </Dialog>
        </SidebarLayout>
    );
};

export default Integrations;
