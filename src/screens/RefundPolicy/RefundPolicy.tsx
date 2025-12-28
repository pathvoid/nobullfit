import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";

const RefundPolicy: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Refund Policy</Heading>
                <div className="mt-8 space-y-4">
                    <Text>Effective Date: 2025-08-26</Text>
                    <Text>
                        At <Strong>NoBullFit</Strong>, we believe in transparency and fairness. This refund policy outlines our approach to refunds for any paid services or subscriptions that may be introduced in the future.
                    </Text>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Current Service Status</Heading>
                        <Text>
                            As of the effective date of this policy, all NoBullFit services are provided free of charge. We do not currently offer any paid subscriptions, premium features, or chargeable services. Since there are no fees associated with using NoBullFit at this time, there are no refunds to process.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Future Paid Services</Heading>
                        <Text>
                            If NoBullFit introduces paid subscriptions or premium features in the future, this refund policy will apply to those services. We are committed to maintaining our core food tracking and progress monitoring features free of charge, as outlined in our <Strong>Terms of Service</Strong>.
                        </Text>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Refund Eligibility</Subheading>
                                <Text>
                                    Should paid services be introduced, refunds will be considered on a case-by-case basis. Generally, refunds may be available within a reasonable timeframe after purchase if you experience technical issues that prevent you from using the service, or if there are billing errors on our part.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Refund Process</Subheading>
                                <Text>
                                    To request a refund for any future paid service, please contact us at <Strong>support@nobull.fit</Strong> with your account information and the reason for your refund request. We will review your request and respond within a reasonable timeframe.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Refund Timeline</Subheading>
                                <Text>
                                    If a refund is approved, it will be processed to the original payment method within 5-10 business days. The exact timeline may vary depending on your payment provider.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Non-Refundable Items</Subheading>
                                <Text>
                                    Please note that certain services or features may be non-refundable, such as one-time purchases or promotional offers. Any such limitations will be clearly disclosed at the time of purchase.
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Free Service Guarantee</Heading>
                        <Text>
                            We want to be clear: our core food tracking and progress monitoring features will always remain free. If premium features are introduced in the future, they will be optional enhancements, and you will always be able to use NoBullFit's essential functionality without any cost.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Contact Information</Heading>
                        <Text>
                            For questions about this refund policy or any billing-related inquiries, please contact us at:
                        </Text>
                        <Text>
                            <Strong>support@nobull.fit</Strong>
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Updates to This Policy</Heading>
                        <Text>
                            This refund policy may be updated if NoBullFit introduces paid services in the future. If significant changes are made, we will notify users clearly on our platform and update the effective date accordingly.
                        </Text>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RefundPolicy;


