import { useState, useEffect, useCallback, useRef } from "react";
import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate } from "react-router-dom";
import { AuthLayout } from "@components/auth-layout";
import { Heading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Badge } from "@components/badge";
import { Button } from "@components/button";
import { Divider } from "@components/divider";
import { Check, Sparkles, Heart, Shield, Download, Clock } from "lucide-react";
import { useAuth } from "@core/contexts/AuthContext";
import { toast } from "sonner";

// Paddle event types
interface PaddleCheckoutEvent {
    name: string;
    data?: {
        status?: string;
        transaction_id?: string;
        customer_id?: string;
    };
}

// Paddle types
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
                    customData?: Record<string, unknown>;
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
        // Global Paddle event handlers that can be updated by any page
        __paddleOnCheckoutComplete?: () => void;
        __paddleOnCheckoutClosed?: () => void;
        __paddleInitialized?: boolean;
    }
}

// Feature list item component for cleaner rendering
const FeatureItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start gap-3">
        <Check className="size-5 text-emerald-500 shrink-0 mt-0.5" />
        <Text className="!mt-0">{children}</Text>
    </li>
);

const ChoosePlan: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [paddleReady, setPaddleReady] = useState(false);
    const [checkoutInProgress, setCheckoutInProgress] = useState(false);
    
    // Track if checkout completed successfully
    const checkoutCompletedRef = useRef(false);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Set up global Paddle event handlers for this page
    useEffect(() => {
        // Handler for checkout.completed - waits for subscription to be confirmed before navigating
        window.__paddleOnCheckoutComplete = async () => {
            checkoutCompletedRef.current = true;
            
            // Wait for sync to confirm subscription before navigating
            // Paddle may take a moment to provision the subscription
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            let retries = 0;
            const maxRetries = 10;
            
            while (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                try {
                    const syncResponse = await fetch("/api/billing/sync", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    if (syncResponse.ok) {
                        const syncData = await syncResponse.json();
                        if (syncData.synced && syncData.hasActiveSubscription) {
                            navigate("/dashboard/billing?subscribed=true");
                            return;
                        }
                    }
                } catch {
                    // Continue retrying
                }
                
                retries++;
            }
            
            // If we exhausted retries, navigate anyway and let billing page handle it
            navigate("/dashboard/billing?subscribed=true");
        };
        
        // Handler for checkout.closed - re-enable buttons if checkout wasn't completed
        window.__paddleOnCheckoutClosed = () => {
            if (!checkoutCompletedRef.current) {
                setCheckoutInProgress(false);
            }
        };
        
        // Cleanup on unmount
        return () => {
            window.__paddleOnCheckoutComplete = undefined;
            window.__paddleOnCheckoutClosed = undefined;
        };
    }, [navigate]);

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
                        // Dispatch to global handlers that each page can set
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

    // Open Paddle checkout
    const openCheckout = useCallback((checkoutData: {
        customerId: string;
        priceId: string;
        email: string;
        clientToken: string;
        environment: string;
    }) => {
        if (!window.Paddle) {
            toast.error("Payment system is not ready. Please try again.");
            return;
        }

        // Mark checkout as in progress and reset completion flag
        setCheckoutInProgress(true);
        checkoutCompletedRef.current = false;

        // Open checkout - only pass customer ID and prevent email changes
        // Note: Do NOT use successUrl - it causes a full page redirect before we can sync
        // Navigation is handled by checkout.completed event callback
        window.Paddle.Checkout.open({
            items: [{ priceId: checkoutData.priceId, quantity: 1 }],
            customer: { id: checkoutData.customerId },
            settings: {
                displayMode: "overlay",
                theme: "light",
                allowLogout: false
            }
        });
    }, []);

    const handleSelectPlan = async (plan: "free" | "pro") => {
        setIsLoading(true);

        try {
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            
            const response = await fetch("/api/auth/select-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to select plan. Please try again.");
                return;
            }

            // If checkout is required (Pro plan), open Paddle checkout
            if (data.requiresCheckout && data.checkout) {
                if (!paddleReady) {
                    toast.error("Payment system is loading. Please try again in a moment.");
                    return;
                }
                await openCheckout(data.checkout);
                return;
            }

            // Update auth context with new user data (including plan)
            if (data.user && token) {
                login(data.user, token, !!localStorage.getItem("auth_token"));
            }

            // Redirect to dashboard
            navigate(data.redirect || "/dashboard");
        } catch (err) {
            console.error("Plan selection error:", err);
            toast.error("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-4xl space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <Heading>Welcome to NoBullFit!</Heading>
                    <Text className="text-lg max-w-2xl mx-auto">
                        Before you get started, let's choose your plan. Don't worry—<Strong>all core features are completely free</Strong>. 
                        We believe privacy and health tracking shouldn't be premium features.
                    </Text>
                </div>

                {/* Plan Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Free Plan */}
                    <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 p-8 flex flex-col bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Heading level={2}>Free</Heading>
                                <Badge color="emerald">Recommended</Badge>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-zinc-900 dark:text-white">$0</span>
                                <span className="text-zinc-500 dark:text-zinc-400">/ forever</span>
                            </div>
                            <Text>Everything you need to take control of your health journey.</Text>
                        </div>

                        <Divider soft className="my-6" />

                        <ul className="space-y-3 flex-1">
                            <FeatureItem>Full food database with detailed nutrition data</FeatureItem>
                            <FeatureItem>Unlimited daily food tracking</FeatureItem>
                            <FeatureItem>Create and share recipes</FeatureItem>
                            <FeatureItem>Grocery list management</FeatureItem>
                            <FeatureItem>Activity and weight tracking</FeatureItem>
                            <FeatureItem>Dashboard analytics with charts</FeatureItem>
                            <FeatureItem>PDF health reports</FeatureItem>
                            <FeatureItem>Full data export</FeatureItem>
                            <FeatureItem>No ads, ever</FeatureItem>
                        </ul>

                        <Button
                            color="emerald"
                            className="w-full mt-6"
                            onClick={() => handleSelectPlan("free")}
                            disabled={isLoading || checkoutInProgress}
                        >
                            {isLoading ? "Setting up your account..." : "Get Started for Free"}
                        </Button>
                    </div>

                    {/* Pro Plan */}
                    <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 p-8 flex flex-col bg-blue-50/50 dark:bg-blue-950/20 relative">
                        <div className="absolute -top-3 right-6">
                            <Badge color="blue">Most Popular</Badge>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Heading level={2}>Pro</Heading>
                                <Sparkles className="size-5 text-blue-500" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-zinc-900 dark:text-white">$10</span>
                                <span className="text-zinc-500 dark:text-zinc-400">/ month</span>
                            </div>
                            <Text>Quality-of-life features for power users.</Text>
                        </div>

                        <Divider soft className="my-6" />

                        <div className="space-y-4 flex-1">
                            <Text className="font-medium text-zinc-700 dark:text-zinc-300">
                                Everything in Free, plus:
                            </Text>
                            <ul className="space-y-3">
                                <FeatureItem>Plan meals for future days and weeks</FeatureItem>
                                <FeatureItem>Copy entire days or weeks of meals</FeatureItem>
                                <FeatureItem>Drag-and-drop meal organization</FeatureItem>
                                <FeatureItem>Plan activities for future days</FeatureItem>
                                <FeatureItem>Copy entire days or weeks of activities</FeatureItem>
                                <FeatureItem>Set weight goals (lose, maintain, gain)</FeatureItem>
                                <FeatureItem>Personalized macro recommendations</FeatureItem>
                                <FeatureItem>Goal timeline projections</FeatureItem>
                                <FeatureItem>Weekly progress insights</FeatureItem>
                                <FeatureItem>Customizable PDF report sections</FeatureItem>
                                <li className="flex items-start gap-3">
                                    <Sparkles className="size-5 text-blue-500 shrink-0 mt-0.5" />
                                    <Text className="!mt-0 italic text-zinc-500 dark:text-zinc-400">And more features coming soon...</Text>
                                </li>
                            </ul>
                        </div>

                        <Button
                            color="blue"
                            className="w-full mt-6"
                            onClick={() => handleSelectPlan("pro")}
                            disabled={isLoading || !paddleReady || checkoutInProgress}
                        >
                            {checkoutInProgress ? "Complete checkout..." : isLoading ? "Processing..." : "Subscribe to Pro"}
                        </Button>
                    </div>
                </div>

                {/* Why Free-First */}
                <div className="space-y-8">
                    <Divider />
                    
                    <div className="text-center space-y-4">
                        <Heading level={2}>Why Free-First?</Heading>
                        <Text className="max-w-2xl mx-auto">
                            We believe everyone deserves access to quality health tracking tools without paying a premium 
                            or sacrificing their privacy. That's why <Strong>all essential features are free</Strong> and always will be.
                        </Text>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="text-center space-y-3 p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <Shield className="size-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <Heading level={3}>Privacy by Default</Heading>
                            <Text className="text-sm">
                                No ads, no data selling, no behavioral tracking. Your health data stays yours.
                            </Text>
                        </div>

                        <div className="text-center space-y-3 p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="inline-flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                <Download className="size-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <Heading level={3}>Full Data Control</Heading>
                            <Text className="text-sm">
                                Export all your data anytime. Delete it whenever you want. No questions asked.
                            </Text>
                        </div>

                        <div className="text-center space-y-3 p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                            <div className="inline-flex items-center justify-center size-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <Clock className="size-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <Heading level={3}>No Paywalls</Heading>
                            <Text className="text-sm">
                                Pro features are conveniences, not necessities. Core functionality is always free.
                            </Text>
                        </div>
                    </div>
                </div>

                {/* Where Does the Money Go */}
                <div className="space-y-6">
                    <Divider />
                    
                    <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <Heart className="size-6 text-rose-500" />
                            <Heading level={3}>Where Does the Money Go?</Heading>
                        </div>
                        <Text>
                            Running a free service isn't free for us. Servers, databases, APIs, email delivery, 
                            and image storage all cost money. When Pro subscriptions become available, your support will go directly 
                            toward <Strong>keeping NoBullFit online and ad-free</Strong> for everyone—including free users.
                        </Text>
                        <Text>
                            We're committed to transparency. NoBullFit is source-available on GitHub, 
                            so you can see exactly how your data is handled and how the platform works.
                        </Text>
                    </div>
                </div>
            </div>
        </AuthLayout>
    );
};

export default ChoosePlan;
