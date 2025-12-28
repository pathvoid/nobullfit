import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { AuthLayout } from "@components/auth-layout";
import { Button } from "@components/button";
import { Field, Label } from "@components/fieldset";
import { Heading } from "@components/heading";
import { Input } from "@components/input";
import { Strong, Text, TextLink } from "@components/text";
import { Logo } from "@components/logo";
import { FormAlert } from "@components/form-alert";

const ResetPassword: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const helmet = useHelmet();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const token = searchParams.get("token");

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setIsSubmitting(true);

        if (!token) {
            setError("Invalid reset link. Please request a new password reset.");
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsSubmitting(false);
            return;
        }

        // Validate password length
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            setIsSubmitting(false);
            return;
        }

        try {
            // Debug: Log token being sent
            console.log("Sending reset request - Token:", token);
            console.log("Token length:", token?.length);
            
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ token, password })
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "An error occurred. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // Success - show success message
            setSuccess(true);
            setIsSubmitting(false);
            
            // Redirect to sign-in after 3 seconds
            setTimeout(() => {
                navigate("/sign-in");
            }, 3000);
        } catch (err) {
            console.error("Reset password error:", err);
            setError("An error occurred while resetting your password. Please try again later.");
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <AuthLayout>
                <div className="grid w-full max-w-sm grid-cols-1 gap-8">
                    <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <Heading>Invalid Reset Link</Heading>
                    <Text>
                        This password reset link is invalid or has expired. Please request a new one.
                    </Text>
                    <Button href="/forgot-password" className="w-full">
                        Request New Reset Link
                    </Button>
                    <Text>
                        Remember your password?{" "}
                        <TextLink href="/sign-in">
                            <Strong>Sign in</Strong>
                        </TextLink>
                    </Text>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
                <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                <Heading>Reset your password</Heading>
                {error && (
                    <FormAlert variant="error">
                        {error}
                    </FormAlert>
                )}
                {success && (
                    <FormAlert variant="success">
                        Your password has been reset successfully. Redirecting to sign in...
                    </FormAlert>
                )}
                {!success && (
                    <>
                        <Text>
                            Enter your new password below.
                        </Text>
                        <Field>
                            <Label>New Password</Label>
                            <Input type="password" name="password" autoComplete="new-password" required />
                        </Field>
                        <Field>
                            <Label>Confirm Password</Label>
                            <Input type="password" name="confirmPassword" autoComplete="new-password" required />
                        </Field>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                        </Button>
                    </>
                )}
                {success && (
                    <Button href="/sign-in" className="w-full">
                        Go to Sign In
                    </Button>
                )}
                {!success && (
                    <Text>
                        Remember your password?{" "}
                        <TextLink href="/sign-in">
                            <Strong>Sign in</Strong>
                        </TextLink>
                    </Text>
                )}
            </form>
        </AuthLayout>
    );
};

export default ResetPassword;
