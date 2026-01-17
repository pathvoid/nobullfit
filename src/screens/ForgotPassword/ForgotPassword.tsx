import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthLayout } from "@components/auth-layout";
import { Button } from "@components/button";
import { Field, Label } from "@components/fieldset";
import { Heading } from "@components/heading";
import { Input } from "@components/input";
import { Strong, Text, TextLink } from "@components/text";
import { Logo } from "@components/logo";
import { toast } from "sonner";

const ForgotPassword: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const navigate = useNavigate();
    const helmet = useHelmet();
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSuccess(false);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;

        try {
            const response = await fetch("/api/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (!response.ok) {
                toast.error(result.error || "An error occurred. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // Success - show success message and change UI
            setSuccess(true);
            toast.success("If an account with that email exists, a password reset link has been sent.");
            setIsSubmitting(false);
        } catch (err) {
            console.error("Forgot password error:", err);
            toast.error("An error occurred while processing your request. Please try again later.");
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8">
                <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                <Heading>Reset your password</Heading>
                {!success && (
                    <>
                        <Text>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>
                        <Field>
                            <Label>Email</Label>
                            <Input type="email" name="email" required />
                        </Field>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send reset link"}
                        </Button>
                    </>
                )}
                {success && (
                    <Button href="/sign-in" className="w-full">
                        Back to Sign In
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

export default ForgotPassword;
