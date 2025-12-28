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
                    <Text>Effective Date: 2025-08-26</Text>
                    <Text>
                        At <Strong>NoBullFit</Strong>, your privacy is our top priority. As a <em>privacy-first</em> platform, we believe your data belongs to you — and we will <Strong>never</Strong> sell it. Ever.
                    </Text>
                    <div className="my-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/banana-secret-service.png" alt="NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Development Status</Heading>
                        <Text>
                            NoBullFit is currently in early development but is now publicly accessible. This privacy policy is now in place to ensure full transparency about how we handle your data from day one.
                        </Text>
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
