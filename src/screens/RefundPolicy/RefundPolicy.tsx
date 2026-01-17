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
                    <Text>Effective Date: 2026-01-18</Text>
                    <Text>
                        At <Strong>NoBullFit</Strong>, we believe in transparency and fairness. This refund policy outlines our approach to refunds for NoBullFit Pro subscriptions.
                    </Text>
                    <div className="my-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/mango-refund.png" alt="NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Subscription Overview</Heading>
                        <Text>
                            NoBullFit offers a Pro subscription at $10/month that provides additional quality-of-life features for power users. Our core food tracking and progress monitoring features remain free of charge. Pro subscriptions are processed through our payment partner, <Strong>Paddle</Strong>.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Cancellation Policy</Heading>
                        <Text>
                            You may cancel your NoBullFit Pro subscription at any time through the Billing page in your dashboard. When you cancel:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>- Your subscription will remain active until the end of your current billing period.</Text>
                            <Text>- You will not be charged for the next billing cycle.</Text>
                            <Text>- After your subscription ends, your account will revert to the free plan.</Text>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Refund Policy</Heading>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Refund Eligibility</Subheading>
                                <Text>
                                    Refunds are considered on a case-by-case basis. You may be eligible for a refund if you experience technical issues that prevent you from using Pro features, if there are billing errors, or within 7 days of your initial subscription if you are unsatisfied with the service.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Refund Process</Subheading>
                                <Text>
                                    To request a refund, please contact us at <Strong>support@nobull.fit</Strong> with your account email and the reason for your refund request. We will review your request and respond within 2-3 business days.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Refund Timeline</Subheading>
                                <Text>
                                    If a refund is approved, it will be processed through Paddle to your original payment method within 5-10 business days. The exact timeline may vary depending on your payment provider and financial institution.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Partial Billing Periods</Subheading>
                                <Text>
                                    We do not provide prorated refunds for partial billing periods. If you cancel mid-cycle, you will retain access to Pro features until the end of your current billing period.
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
