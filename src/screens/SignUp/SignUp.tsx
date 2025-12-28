import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthLayout } from "@components/auth-layout";
import { Button } from "@components/button";
import { Checkbox, CheckboxField } from "@components/checkbox";
import { Field, Label } from "@components/fieldset";
import { Heading } from "@components/heading";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { Strong, Text, TextLink } from "@components/text";
import { Logo } from "@components/logo";
import { FormAlert } from "@components/form-alert";
import { Captcha } from "@components/captcha";
import { COUNTRIES } from "@utils/countries";

const SignUp: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const navigate = useNavigate();
    const helmet = useHelmet();
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCaptchaValid, setIsCaptchaValid] = useState(false);

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setIsSubmitting(false);
            return;
        }

        // Validate CAPTCHA
        if (!isCaptchaValid) {
            setError("Please solve the math problem correctly.");
            setIsSubmitting(false);
            return;
        }

        const captchaAnswer = formData.get("captcha_answer") as string;
        const userCaptchaAnswer = formData.get("captcha") as string;

        const data = {
            email: formData.get("email"),
            name: formData.get("name"),
            password: password,
            country: formData.get("country"),
            terms: formData.get("terms") === "on",
            captcha: userCaptchaAnswer,
            captchaAnswer: captchaAnswer
        };

        try {
            const response = await fetch("/api/sign-up", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "An error occurred. Please try again.");
                setIsSubmitting(false);
                return;
            }

            // Success - redirect to sign-in
            if (result.redirect) {
                navigate(result.redirect);
            } else {
                navigate("/sign-in");
            }
        } catch (err) {
            console.error("Sign up error:", err);
            setError("An error occurred while creating your account. Please try again later.");
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-8 sm:max-w-2xl sm:grid-cols-2">
                <Logo className="col-span-full h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                <Heading className="col-span-full">Create your account</Heading>
                {error && (
                    <FormAlert variant="error" className="col-span-full">
                        {error}
                    </FormAlert>
                )}
                <Field>
                    <Label>Email</Label>
                    <Input type="email" name="email" required />
                </Field>
                <Field>
                    <Label>Full name</Label>
                    <Input name="name" required />
                </Field>
                <Field>
                    <Label>Password</Label>
                    <Input type="password" name="password" autoComplete="new-password" required />
                </Field>
                <Field>
                    <Label>Confirm Password</Label>
                    <Input type="password" name="confirmPassword" autoComplete="new-password" required />
                </Field>
                <Field className="col-span-full">
                    <Label>Country</Label>
                    <Select name="country" required>
                        <option value="">Select a country</option>
                        {COUNTRIES.map((country) => (
                            <option key={country} value={country}>
                                {country}
                            </option>
                        ))}
                    </Select>
                </Field>
                <div className="col-span-full">
                    <Captcha onValidate={setIsCaptchaValid} />
                </div>
                <CheckboxField className="col-span-full">
                    <Checkbox name="terms" required />
                    <Label>
                        I agree to the <TextLink href="/terms-of-service">Terms of Service</TextLink> and <TextLink href="/privacy-policy">Privacy Policy</TextLink>.
                    </Label>
                </CheckboxField>
                <Button type="submit" className="col-span-full w-full" disabled={isSubmitting || !isCaptchaValid}>
                    {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
                <Text className="col-span-full text-center">
                    Already have an account?{" "}
                    <TextLink href="/sign-in">
                        <Strong>Sign in</Strong>
                    </TextLink>
                </Text>
            </form>
        </AuthLayout>
    );
};

export default SignUp;
