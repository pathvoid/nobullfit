import useHelmet from "@hooks/useHelmet";
import { useNavigate, useLoaderData } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { AuthLayout } from "@components/auth-layout";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { FormAlert } from "@components/form-alert";
import { Logo } from "@components/logo";

// Module-level flag to prevent duplicate requests across component instances (e.g., React Strict Mode)
const pendingRequests = new Set<string>();
// Store results for tokens that have completed (so other instances can see the result)
const completedRequests = new Map<string, { status: "success" | "error"; message: string }>();

const ConfirmEmailChange: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState<string>("");
    const hasRequestedRef = useRef<boolean>(false);

    // Set page metadata - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Confirm email change - only run once on mount
    useEffect(() => {
        // Guard to prevent re-execution - check ref FIRST
        if (hasRequestedRef.current) {
            return;
        }

        // Read token directly from URL
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get("token");

        if (!token) {
            setStatus("error");
            setMessage("Invalid confirmation link. Please check your email and try again.");
            hasRequestedRef.current = true;
            return;
        }

        // Trim whitespace from token
        token = token.trim();

        // Use module-level Set to prevent duplicate requests (works across component instances)
        // This MUST be checked before setting hasRequestedRef to prevent race conditions
        if (pendingRequests.has(token)) {
            // Another instance is already processing this token - poll for completion
            hasRequestedRef.current = true;
            const pollInterval = setInterval(() => {
                const completed = completedRequests.get(token);
                if (completed) {
                    setStatus(completed.status);
                    setMessage(completed.message);
                    clearInterval(pollInterval);
                }
            }, 100);
            
            // Cleanup interval on unmount
            return () => clearInterval(pollInterval);
        }

        // Check if this token was already completed
        const alreadyCompleted = completedRequests.get(token);
        if (alreadyCompleted) {
            setStatus(alreadyCompleted.status);
            setMessage(alreadyCompleted.message);
            hasRequestedRef.current = true;
            return;
        }

        // Mark as requested IMMEDIATELY to prevent this effect from running again
        hasRequestedRef.current = true;
        // Mark this token as being processed in the Set
        pendingRequests.add(token);

        const confirmEmailChange = async () => {
            try {
                const response = await fetch("/api/settings/confirm-email-change", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ token })
                });

                const data = await response.json();

                if (!response.ok) {
                    const errorMessage = data.error || "Failed to confirm email change. Please try again.";
                    setStatus("error");
                    setMessage(errorMessage);
                    // Store result for other instances
                    completedRequests.set(token, { status: "error", message: errorMessage });
                    return;
                }

                const successMessage = data.message || "Your email address has been successfully updated.";
                setStatus("success");
                setMessage(successMessage);
                // Store result for other instances
                completedRequests.set(token, { status: "success", message: successMessage });
            } catch (err) {
                const errorMessage = "An error occurred. Please try again.";
                setStatus("error");
                setMessage(errorMessage);
                // Store result for other instances
                completedRequests.set(token, { status: "error", message: errorMessage });
            } finally {
                // Remove token from pending set after request completes
                pendingRequests.delete(token);
            }
        };

        confirmEmailChange();
    }, []);

    return (
        <AuthLayout>
            <div className="w-full max-w-sm space-y-8">
                <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                <Heading>Confirm Email Change</Heading>

                {status === "loading" && (
                    <div className="space-y-4">
                        <Text>Processing your email change confirmation...</Text>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            Please wait while we verify your confirmation link. This will only take a moment.
                        </Text>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-6">
                        <FormAlert variant="success">
                            {message}
                        </FormAlert>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            Your email address has been successfully updated. Please sign in with your new email address.
                        </Text>
                        <Button onClick={() => (window.location.href = "/sign-in")} className="w-full">
                            Sign In
                        </Button>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6">
                        <FormAlert variant="error">
                            {message}
                        </FormAlert>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            If you need to change your email address, please go to your settings page and request a new email change.
                        </Text>
                        <Button onClick={() => (window.location.href = "/dashboard/settings")} className="w-full">
                            Go to Settings
                        </Button>
                    </div>
                )}
            </div>
        </AuthLayout>
    );
};

export default ConfirmEmailChange;
