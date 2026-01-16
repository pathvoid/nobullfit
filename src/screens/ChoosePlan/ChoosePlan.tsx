import { useState } from "react";
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
    const [error, setError] = useState<string | null>(null);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleSelectPlan = async (plan: "free" | "pro") => {
        if (plan === "pro") {
            // Pro is not available yet
            return;
        }

        setIsLoading(true);
        setError(null);

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
                setError(data.error || "Failed to select plan. Please try again.");
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
            setError("An error occurred. Please try again.");
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

                {/* Error message */}
                {error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                        <Text className="text-red-700 dark:text-red-300 !mt-0">{error}</Text>
                    </div>
                )}

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
                            disabled={isLoading}
                        >
                            {isLoading ? "Setting up your account..." : "Get Started for Free"}
                        </Button>
                    </div>

                    {/* Pro Plan */}
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 flex flex-col bg-zinc-100 dark:bg-zinc-800/30 relative opacity-75">
                        <div className="absolute -top-3 right-6">
                            <Badge color="blue">Coming Soon</Badge>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <Heading level={2}>Pro</Heading>
                                <Sparkles className="size-5 text-blue-500" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-zinc-900 dark:text-white">TBD</span>
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
                                <FeatureItem>Set weight goals with recommendations</FeatureItem>
                                <FeatureItem>Goal timeline projections</FeatureItem>
                            </ul>
                        </div>

                        <Button
                            outline
                            className="w-full mt-6"
                            disabled
                        >
                            Not Available Yet
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
                            Running a free service isn't free for us. Servers, databases, the food API, email delivery, 
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
