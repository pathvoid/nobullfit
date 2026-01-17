import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { AuthLayout } from "@components/auth-layout";
import { useAuth } from "@core/contexts/AuthContext";
import { Button } from "@components/button";
import { Checkbox, CheckboxField } from "@components/checkbox";
import { Field, Label } from "@components/fieldset";
import { Heading } from "@components/heading";
import { Input } from "@components/input";
import { Strong, Text, TextLink } from "@components/text";
import { Logo } from "@components/logo";
import { toast } from "sonner";

const SignIn: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const helmet = useHelmet();
    const { login } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            email: formData.get("email"),
            password: formData.get("password"),
            remember: formData.get("remember") === "on"
        };

        try {
            const response = await fetch("/api/sign-in", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || "An error occurred. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // Success - save token and user, then redirect
            if (result.token && result.user) {
                // Pass remember flag to login function
                login(result.user, result.token, data.remember);
                // Redirect after saving token - check URL query parameter first, then API response
                const redirectTo = searchParams.get("redirect") || result.redirect || "/";
                // Use window.location for full page reload to ensure cookies are available
                // This ensures the server-side loader can read the cookie
                window.location.href = redirectTo;
            } else {
                // Token or user missing - show error
                toast.error("Authentication failed. Please try again.");
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error("Sign in error:", err);
            toast.error("An error occurred while signing in. Please try again later.");
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
                <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                <Heading>Sign in to your account</Heading>
                <Field>
                    <Label>Email</Label>
                    <Input type="email" name="email" />
                </Field>
                <Field>
                    <Label>Password</Label>
                    <Input type="password" name="password" />
                </Field>
                <div className="flex items-center justify-between">
                    <CheckboxField>
                        <Checkbox name="remember" />
                        <Label>Remember me</Label>
                    </CheckboxField>
                    <Text>
                        <TextLink href="/forgot-password">
                            <Strong>Forgot password?</Strong>
                        </TextLink>
                    </Text>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
                <Text>
                    Don't have an account?{" "}
                    <TextLink href="/sign-up">
                        <Strong>Sign up</Strong>
                    </TextLink>
                </Text>
            </form>
        </AuthLayout>
    );
};

export default SignIn;
