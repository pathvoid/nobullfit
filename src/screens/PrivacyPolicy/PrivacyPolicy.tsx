import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";

const PrivacyPolicy: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Privacy Policy</Heading>
                <div className="mt-8 space-y-4">
                    <Text>Effective Date: 2026-01-18</Text>
                    <Text>
                        At <Strong>NoBullFit</Strong>, your privacy is our top priority. As a <em>privacy-first</em> platform, we believe your data belongs to you — and we will <Strong>never</Strong> sell it. Ever.
                    </Text>
                    <div className="my-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/banana-secret-service.png" alt="NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Our Privacy Commitment</Heading>
                        <Text>
                            When you use NoBullFit, you can trust that:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Your personal data belongs to you.
                            </Text>
                            <Text>
                                - We <Strong>do not</Strong> and <Strong>will not</Strong> sell your data to third parties.
                            </Text>
                            <Text>
                                - We only collect what's necessary to provide and improve your experience.
                            </Text>
                            <Text>
                                - You have full control over your data.
                            </Text>
                        </div>
                        <Text>
                            We are committed to applying best-in-class security practices and protecting your privacy at every step.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What This Policy Covers</Heading>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Data Collection</Subheading>
                                <Text>
                                    We only collect essential information such as your email address, username, progress tracking data (e.g., weight, sleep, activity), and preferences. We'll always be transparent about why we need it.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Data Usage</Subheading>
                                <Text>
                                    Your data is used strictly to provide you with personalized insights, track your progress, and improve the NoBullFit experience. We never use your data for targeted advertising.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Data Protection</Subheading>
                                <Text>
                                    We implement robust technical and organizational measures to protect your data from unauthorized access, misuse, or loss.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Your Rights</Subheading>
                                <Text>
                                    You have the right to access, correct, or delete your personal data at any time. You can also request the deletion of your account with no questions asked in your settings.
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Payment Processing</Heading>
                        <Text>
                            If you subscribe to NoBullFit Pro, your payment is processed by our payment partner, <Strong>Paddle</Strong> (Paddle.com Market Limited). When you make a payment:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>- Paddle acts as the Merchant of Record for all transactions.</Text>
                            <Text>- Your payment information (credit card details, billing address) is collected and stored by Paddle, not by NoBullFit.</Text>
                            <Text>- We receive only the information necessary to manage your subscription (customer ID, subscription status, billing dates).</Text>
                            <Text>- Paddle may send you transactional emails related to your subscription.</Text>
                        </div>
                        <Text>
                            For more information about how Paddle handles your data, please review <Strong>Paddle's Privacy Policy</Strong> at paddle.com/legal/privacy.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Third-Party Services</Heading>
                        <Text>
                            NoBullFit uses the following third-party services:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>- <Strong>Paddle</Strong>: Payment processing for Pro subscriptions.</Text>
                            <Text>- <Strong>Amazon SES</Strong>: Email delivery for account notifications.</Text>
                            <Text>- <Strong>Cloudflare R2</Strong>: Secure storage for recipe images.</Text>
                            <Text>- <Strong>Open Food Facts</Strong>: Food nutrition database (no user data shared).</Text>
                        </div>
                        <Text>
                            We only share the minimum data necessary with these services to provide our features, and we never share your health tracking data with any third party.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Contact Information</Heading>
                        <Text>
                            For questions about this policy or the application itself, please contact us at:
                        </Text>
                        <Text>
                            <Strong>support@nobull.fit</Strong>
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Updates to This Policy</Heading>
                        <Text>
                            We may update this privacy policy as NoBullFit evolves or to comply with legal requirements. If significant changes are made, we'll notify users clearly on our site.
                        </Text>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrivacyPolicy;
