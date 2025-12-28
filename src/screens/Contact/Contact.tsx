import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading } from "@components/heading";
import { Text, Strong } from "@components/text";

const Contact: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center">
                        <Heading>Contact Us</Heading>
                    </div>
                    <div className="mt-8 space-y-4">
                    <Text>
                        We're here to help! If you have questions, feedback, or need assistance with <Strong>NoBullFit</Strong>, please reach out to us using the contact information below.
                    </Text>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Email Support</Heading>
                        <Text>
                            For general inquiries, support requests, or feedback, please email us at:
                        </Text>
                        <Text>
                            <Strong>support@nobull.fit</Strong>
                        </Text>
                        <Text>
                            We aim to respond to all inquiries within a reasonable timeframe. For registered users, we may require additional information to verify your account and provide the best possible assistance.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What to Include</Heading>
                        <Text>
                            When contacting us, please include:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - A clear description of your question or issue
                            </Text>
                            <Text>
                                - Your username or email address if you're a registered user
                            </Text>
                            <Text>
                                - Any relevant details that can help us assist you
                            </Text>
                        </div>
                        <Text>
                            For registered users experiencing technical issues, we may request additional information such as your account details, device information, or screenshots to help diagnose and resolve the problem.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Response Time</Heading>
                        <Text>
                            We strive to respond to all inquiries promptly. Response times may vary depending on the nature of your request, but we typically respond within 1-3 business days.
                        </Text>
                    </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Contact;
