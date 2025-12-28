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
                    <Text>Effective Date: 2025-08-05</Text>
                    <Text>
                        Welcome to <Strong>NoBullFit</Strong>. By using our services, you agree to these Terms of Service. NoBullFit is a privacy-first platform dedicated to helping users track food, monitor progress, and achieve their health goals while respecting their data.
                    </Text>
                    <div className="my-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/kiwi-lawyer.png" alt="NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Development Status</Heading>
                        <Text>
                            NoBullFit is currently in early development but is now publicly accessible. These Terms of Service ensure that all users clearly understand their rights and responsibilities while using the platform.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Service Overview</Heading>
                        <Text>
                            NoBullFit provides free tools for food tracking and progress monitoring with a strong focus on data privacy. Core features are available at no cost, and optional premium features may be introduced in the future. However, essential functionality will always remain accessible without charge.
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
                        <Heading level={2}>Free Service Commitment</Heading>
                        <Text>
                            We are committed to offering our core food tracking and progress monitoring features free of charge. If premium features are introduced in the future, the core experience will always remain free and accessible to all users.
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


