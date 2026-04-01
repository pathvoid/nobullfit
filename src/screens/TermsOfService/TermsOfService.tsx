import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong, TextLink } from "@components/text";

const TermsOfService: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Terms of Service</Heading>
                <div className="mt-8 space-y-4">
                    <Text>Effective Date: 2026-01-18</Text>
                    <Text>
                        Welcome to <Strong>NoBullFit</Strong>. By using our services, you agree to these Terms of Service. NoBullFit is a privacy-first platform dedicated to helping users track food, monitor progress, and achieve their health goals while respecting their data.
                    </Text>
                    <div className="my-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/kiwi-lawyer.png" alt="NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Service Overview</Heading>
                        <Text>
                            NoBullFit provides tools for food tracking and progress monitoring with a strong focus on data privacy. Core features are available at no cost. Optional premium features are available through NoBullFit Pro, a paid subscription. Essential functionality will always remain accessible without charge.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What These Terms Cover</Heading>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Acceptance of Terms</Subheading>
                                <Text>
                                    By accessing or using NoBullFit, you agree to be bound by these Terms of Service. If you do not agree, you may not use our services.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Service Description</Subheading>
                                <Text>
                                    NoBullFit provides tools for health and wellness tracking, including food logs, activity monitoring, and progress insights. These features are designed to support healthier habits while protecting your privacy.
                                </Text>
                            </div>
                            <div>
                                <Subheading>User Responsibilities</Subheading>
                                <Text>
                                    You agree to use NoBullFit for lawful, personal, and non-commercial purposes. Misuse of the service, including attempts to access unauthorized areas or impersonate others, may result in account suspension or termination.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Privacy and Data</Subheading>
                                <Text>
                                    NoBullFit is a privacy-first platform. We collect only the data needed to provide our services and will <Strong>never</Strong> sell your personal information. Please refer to our <TextLink href="/privacy">Privacy Policy</TextLink> for full details.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Limitations of Liability</Subheading>
                                <Text>
                                    NoBullFit is provided "as is." While we strive to offer a reliable and accurate service, we are not liable for any issues such as data loss, service disruptions, or indirect damages arising from the use of the platform.
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>NoBullFit Pro Subscription</Heading>
                        <Text>
                            NoBullFit offers an optional Pro subscription at $10/month that provides additional features for power users, including meal planning, activity planning, and weight goal tracking.
                        </Text>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Billing</Subheading>
                                <Text>
                                    Pro subscriptions are billed monthly through our payment partner, <Strong>Paddle</Strong> (Paddle.com Market Limited), who acts as the Merchant of Record. By subscribing, you authorize Paddle to charge your payment method on a recurring basis until you cancel.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Cancellation</Subheading>
                                <Text>
                                    You may cancel your subscription at any time through the Billing page in your dashboard. Cancellation takes effect at the end of your current billing period. You will retain access to Pro features until then.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Changes to Pricing</Subheading>
                                <Text>
                                    We reserve the right to change subscription pricing. If prices change, we will notify existing subscribers in advance, and the new price will apply to subsequent billing cycles.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Pro Feature Access</Subheading>
                                <Text>
                                    Pro features such as future meal planning and activity planning are only available during an active subscription. When your subscription ends, any future-dated entries beyond the current day will be removed from your account.
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Free Service Commitment</Heading>
                        <Text>
                            We are committed to offering our core food tracking and progress monitoring features free of charge. Pro features are optional enhancements, and the core experience will always remain free and accessible to all users.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Contact Information</Heading>
                        <Text>
                            For questions about these terms or the application itself, please contact us at:
                        </Text>
                        <Text>
                            <Strong>support@nobull.fit</Strong>
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Updates to These Terms</Heading>
                        <Text>
                            These Terms of Service may be updated as NoBullFit evolves. If significant changes are made, we will notify users clearly on our platform.
                        </Text>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TermsOfService;
