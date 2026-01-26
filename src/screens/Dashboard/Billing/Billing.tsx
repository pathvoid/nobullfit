import { useState, useEffect, useCallback, useRef } from "react";
import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";
import { Badge } from "@components/badge";
import { Divider } from "@components/divider";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@components/description-list";
import { CreditCard, ExternalLink, Sparkles, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";

// Paddle event types
interface PaddleCheckoutEvent {
    name: string;
    data?: {
        status?: string;
        transaction_id?: string;
        customer_id?: string;
    };
}

// Paddle types for checkout
declare global {
    interface Window {
        Paddle?: {
            Environment: {
                set: (env: "sandbox" | "production") => void;
            };
            Initialize: (options: { 
                token: string;
                eventCallback?: (event: PaddleCheckoutEvent) => void;
            }) => void;
            Checkout: {
                open: (options: {
                    items: Array<{ priceId: string; quantity: number }>;
                    customer?: { id: string; email?: string };
                    settings?: {
                        displayMode?: "overlay" | "inline";
                        theme?: "light" | "dark";
                        locale?: string;
                        successUrl?: string;
                        allowLogout?: boolean;
                    };
                }) => void;
            };
        };
        // Global Paddle event handlers
        __paddleOnCheckoutComplete?: () => void;
        __paddleOnCheckoutClosed?: () => void;
        __paddleInitialized?: boolean;
    }
}

// Subscription data type
interface SubscriptionData {
    plan: "free" | "pro";
    subscribed: boolean;
    subscribedAt: string | null;
    subscriptionStatus: "active" | "paused" | "past_due" | "canceled" | "trialing" | null;
    subscriptionEndsAt: string | null;
    subscriptionCanceledAt: string | null;
    subscription: {
        id: string;
        status: string;
        nextBilledAt: string | null;
        currentPeriod: {
            starts_at: string;
            ends_at: string;
        } | null;
        scheduledChange: {
            action: string;
            effective_at: string;
        } | null;
        price: {
            amount: string;
            interval: string;
            frequency: number;
        } | null;
    } | null;
}

// Status badge component
const StatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
    switch (status) {
        case "active":
            return <Badge color="emerald">Active</Badge>;
        case "trialing":
            return <Badge color="blue">Trial</Badge>;
        case "paused":
            return <Badge color="amber">Paused</Badge>;
        case "past_due":
            return <Badge color="red">Past Due</Badge>;
        case "canceled":
            return <Badge color="zinc">Canceled</Badge>;
        default:
            return <Badge color="zinc">Free</Badge>;
    }
};

// Format date helper
const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
};

const Billing: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPortalLoading, setIsPortalLoading] = useState(false);
    const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [paddleReady, setPaddleReady] = useState(false);
    
    // Use ref to store the refresh function for Paddle callback
    const refreshSubscriptionRef = useRef<() => Promise<void>>();

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Set up global Paddle event handlers for this page
    useEffect(() => {
        // Set the global handler for checkout completion
        window.__paddleOnCheckoutComplete = () => {
            refreshSubscriptionRef.current?.();
        };
        
        // Cleanup on unmount
        return () => {
            window.__paddleOnCheckoutComplete = undefined;
        };
    }, []);

    // Load Paddle.js script and initialize (only once globally)
    useEffect(() => {
        if (typeof window === "undefined") return;

        const initPaddle = async () => {
            if (!window.Paddle) {
                console.error("Paddle.js not loaded");
                return;
            }
            
            // Only initialize once globally
            if (window.__paddleInitialized) {
                setPaddleReady(true);
                return;
            }
            
            // Get Paddle config from the API
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            
            try {
                const res = await fetch("/api/billing/paddle-config", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (!res.ok) {
                    throw new Error(`Config fetch failed: ${res.status}`);
                }
                
                const config = await res.json();
                
                if (!config.clientToken) {
                    throw new Error("Missing client token in config");
                }
                
                if (config.environment === "sandbox") {
                    window.Paddle?.Environment.set("sandbox");
                }
                
                // Initialize once with global callback dispatcher
                window.Paddle?.Initialize({
                    token: config.clientToken,
                    eventCallback: (event: PaddleCheckoutEvent) => {
                        // Dispatch to global handlers
                        if (event.name === "checkout.completed") {
                            window.__paddleOnCheckoutComplete?.();
                        }
                        if (event.name === "checkout.closed") {
                            window.__paddleOnCheckoutClosed?.();
                        }
                    }
                });
                
                window.__paddleInitialized = true;
                setPaddleReady(true);
            } catch (err) {
                console.error("Failed to initialize Paddle:", err);
                // Don't set paddleReady to true - leave button disabled
                // User can refresh to retry
            }
        };

        // Check if script already loaded
        if (window.Paddle) {
            initPaddle();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.async = true;
        script.onload = () => initPaddle();
        script.onerror = () => {
            console.error("Failed to load Paddle.js script");
        };
        document.body.appendChild(script);
    }, []);

    // Sync and fetch subscription data
    useEffect(() => {
        const syncAndFetchSubscription = async () => {
            try {
                const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
                
                // Check if we just came from checkout success
                const urlParams = new URLSearchParams(window.location.search);
                const justSubscribed = urlParams.get("subscribed") === "true";
                
                if (justSubscribed) {
                    // Add a small delay to give Paddle time to process the subscription
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Sync subscription status with Paddle with retry
                    let syncSuccess = false;
                    for (let attempt = 0; attempt < 3 && !syncSuccess; attempt++) {
                        try {
                            const syncResponse = await fetch("/api/billing/sync", {
                                method: "POST",
                                headers: {
                                    Authorization: `Bearer ${token}`
                                }
                            });
                            
                            if (syncResponse.ok) {
                                const syncData = await syncResponse.json();
                                if (syncData.synced && syncData.hasActiveSubscription) {
                                    toast.success("Welcome to NoBullFit Pro!");
                                    syncSuccess = true;
                                } else if (attempt < 2) {
                                    // Subscription not found yet, wait and retry
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                        } catch (syncErr) {
                            console.error("Error syncing subscription:", syncErr);
                            if (attempt < 2) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                    }
                    
                    // Clean up URL
                    window.history.replaceState({}, "", window.location.pathname);
                }
                
                // Fetch current subscription status
                const response = await fetch("/api/billing/subscription", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch subscription");
                }

                const data = await response.json();
                setSubscription(data);
            } catch (err) {
                console.error("Error fetching subscription:", err);
                toast.error("Failed to load subscription details");
            } finally {
                setIsLoading(false);
            }
        };

        syncAndFetchSubscription();
    }, []);

    // Open customer portal
    const handleManageSubscription = async () => {
        setIsPortalLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            const response = await fetch("/api/billing/portal", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to create portal session");
            }

            const data = await response.json();
            
            // Open portal in new tab
            window.open(data.url, "_blank");
        } catch (err) {
            console.error("Error opening portal:", err);
            toast.error("Failed to open billing portal");
        } finally {
            setIsPortalLoading(false);
        }
    };

    // Refresh subscription data after checkout or manual sync
    const refreshSubscription = useCallback(async (showSuccessToast = true) => {
        try {
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            
            // Add delay to give Paddle time to process
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Sync with Paddle first
            await fetch("/api/billing/sync", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Fetch updated subscription data
            const response = await fetch("/api/billing/subscription", {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const wasFreePlan = subscription?.plan === "free" || !subscription?.subscribed;
                const isNowPro = data.plan === "pro" && data.subscribed;
                setSubscription(data);
                if (showSuccessToast) {
                    if (wasFreePlan && isNowPro) {
                        toast.success("Welcome to NoBullFit Pro!");
                    } else {
                        toast.success("Subscription synced!");
                    }
                }
            }
        } catch (err) {
            console.error("Error refreshing subscription:", err);
            toast.error("Failed to sync subscription");
        }
    }, [subscription]);
    
    // Update the ref whenever refreshSubscription changes
    useEffect(() => {
        refreshSubscriptionRef.current = refreshSubscription;
    }, [refreshSubscription]);

    // Manual sync handler
    const handleSyncSubscription = async () => {
        setIsSyncing(true);
        await refreshSubscription(true);
        setIsSyncing(false);
    };

    // Handle upgrade to Pro
    const handleUpgrade = async () => {
        setIsUpgradeLoading(true);
        try {
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            const response = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to initialize checkout");
            }

            const checkoutData = await response.json();

            if (!paddleReady || !window.Paddle) {
                toast.error("Payment system is loading. Please try again.");
                return;
            }

            // Open checkout - only pass customer ID and prevent email changes
            window.Paddle.Checkout.open({
                items: [{ priceId: checkoutData.priceId, quantity: 1 }],
                customer: { id: checkoutData.customerId },
                settings: {
                    displayMode: "overlay",
                    theme: "light",
                    allowLogout: false
                }
            });
        } catch (err) {
            console.error("Error initializing checkout:", err);
            toast.error(err instanceof Error ? err.message : "Failed to start checkout");
        } finally {
            setIsUpgradeLoading(false);
        }
    };

    const isPro = subscription?.plan === "pro" && subscription?.subscribed;
    const hasCancellation = subscription?.subscription?.scheduledChange?.action === "cancel";

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo href="/dashboard" className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/billing" />}
        >
            {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Text>Loading billing information...</Text>
                </div>
            ) : (
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <Heading level={1}>Billing</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Manage your subscription and billing details.
                    </Text>
                </div>

                {/* Current Plan */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isPro ? (
                                <Sparkles className="size-6 text-blue-500" />
                            ) : (
                                <CreditCard className="size-6 text-zinc-400" />
                            )}
                            <div>
                                <Heading level={3}>
                                    NoBullFit {isPro ? "Pro" : "Free"}
                                </Heading>
                                <Text className="!mt-0">
                                    {isPro ? "$10/month" : "Free forever"}
                                </Text>
                            </div>
                        </div>
                        <StatusBadge status={subscription?.subscriptionStatus || (isPro ? "active" : null)} />
                    </div>

                    {/* Subscription details for Pro users */}
                    {isPro && subscription?.subscription && (
                        <>
                            <Divider soft />
                            <DescriptionList>
                                <DescriptionTerm>Status</DescriptionTerm>
                                <DescriptionDetails className="flex items-center gap-2">
                                    {subscription.subscriptionStatus === "active" && (
                                        <CheckCircle className="size-4 text-emerald-500" />
                                    )}
                                    {subscription.subscriptionStatus === "past_due" && (
                                        <AlertCircle className="size-4 text-red-500" />
                                    )}
                                    {subscription.subscriptionStatus === "paused" && (
                                        <Clock className="size-4 text-amber-500" />
                                    )}
                                    {subscription.subscriptionStatus === "canceled" && (
                                        <XCircle className="size-4 text-zinc-500" />
                                    )}
                                    <span className="capitalize">{subscription.subscriptionStatus}</span>
                                </DescriptionDetails>

                                <DescriptionTerm>Member since</DescriptionTerm>
                                <DescriptionDetails>
                                    {formatDate(subscription.subscribedAt)}
                                </DescriptionDetails>

                                {subscription.subscription.nextBilledAt && !hasCancellation && (
                                    <>
                                        <DescriptionTerm>Next billing date</DescriptionTerm>
                                        <DescriptionDetails>
                                            {formatDate(subscription.subscription.nextBilledAt)}
                                        </DescriptionDetails>
                                    </>
                                )}

                                {subscription.subscription.price && (
                                    <>
                                        <DescriptionTerm>Amount</DescriptionTerm>
                                        <DescriptionDetails>
                                            {subscription.subscription.price.amount} / {subscription.subscription.price.interval}
                                        </DescriptionDetails>
                                    </>
                                )}
                            </DescriptionList>

                            {/* Cancellation notice */}
                            {hasCancellation && subscription.subscription.scheduledChange && (
                                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <Text className="!mt-0">
                                                <Strong>Your subscription is scheduled to cancel</Strong>
                                            </Text>
                                            <Text className="text-sm !mt-1">
                                                Your Pro access will end on {formatDate(subscription.subscription.scheduledChange.effective_at)}. 
                                                You can reactivate anytime before this date.
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Past due notice */}
                            {subscription.subscriptionStatus === "past_due" && (
                                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <Text className="!mt-0">
                                                <Strong>Payment failed</Strong>
                                            </Text>
                                            <Text className="text-sm !mt-1">
                                                We couldn't process your payment. Please update your payment method to continue your subscription.
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-2">
                        {isPro ? (
                            <>
                                <Button
                                    onClick={handleManageSubscription}
                                    disabled={isPortalLoading}
                                >
                                    <CreditCard className="size-4" data-slot="icon" />
                                    {isPortalLoading ? "Opening..." : "Manage Subscription"}
                                    <ExternalLink className="size-3 ml-1" />
                                </Button>
                                <Button
                                    outline
                                    onClick={handleSyncSubscription}
                                    disabled={isSyncing}
                                >
                                    <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} data-slot="icon" />
                                    {isSyncing ? "Syncing..." : "Sync Status"}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    color="blue"
                                    onClick={handleUpgrade}
                                    disabled={isUpgradeLoading || !paddleReady}
                                >
                                    <Sparkles className="size-4" data-slot="icon" />
                                    {isUpgradeLoading ? "Processing..." : "Upgrade to Pro"}
                                </Button>
                                <Button
                                    outline
                                    onClick={handleSyncSubscription}
                                    disabled={isSyncing}
                                >
                                    <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} data-slot="icon" />
                                    {isSyncing ? "Syncing..." : "Sync Status"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Billing History Note */}
                {isPro && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <Subheading>Billing History & Invoices</Subheading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            To view your billing history, download invoices, or update your payment method, 
                            click "Manage Subscription" above to access the customer portal.
                        </Text>
                    </div>
                )}
            </div>
            )}
        </SidebarLayout>
    );
};

export default Billing;
