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
import { FormAlert } from "@components/form-alert";

const ForgotPassword: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const navigate = useNavigate();
    const helmet = useHelmet();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
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
                setError(result.error || "An error occurred. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // Success - show success message
            setSuccess(true);
            setIsSubmitting(false);
        } catch (err) {
            console.error("Forgot password error:", err);
            setError("An error occurred while processing your request. Please try again later.");
            setIsSubmitting(false);
        }
    };

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
                        If an account with that email exists, a password reset link has been sent. Please check the server console for the reset link.
                    </FormAlert>
                )}
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
