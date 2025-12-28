import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading } from "@components/heading";
import { Text, Strong } from "@components/text";

const About: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <div className="max-w-3xl mx-auto space-y-12">
                    <div className="text-center space-y-8">
                        <Heading>About NoBullFit</Heading>
                        <Text className="text-lg">
                            Free food tracking and progress monitoring with privacy first
                        </Text>
                    </div>
                    <div className="flex justify-center">
                        <img src="https://cdn.nobull.fit/campfire.png" alt="NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="space-y-24">
                        <div className="space-y-6">
                            <Heading level={2}>Mission</Heading>
                            <Text>
                                NoBullFit provides a free platform for tracking food intake, nutritional data, and personal fitness progress while prioritizing your data privacy above all else.
                            </Text>
                        </div>
                        <div className="space-y-6">
                            <Heading level={2}>What We Offer</Heading>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>Free Food Tracking</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            Log your meals, track calories, and monitor nutritional intake
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>Progress Monitoring</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            Track your fitness journey with detailed progress analytics
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>Data Privacy First</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            Your personal data stays private and secure
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <Heading level={2}>Our Approach</Heading>
                            <Text>
                                We believe that tracking your nutrition and fitness progress shouldn't come at the cost of your privacy. NoBullFit is built from the ground up with data privacy as our core principle.
                            </Text>
                            <Text>
                                The core features are completely free to use. We may offer paid plans in the future for advanced features, but the essential food tracking and progress monitoring will always remain free.
                            </Text>
                        </div>
                        <div className="space-y-6">
                            <Heading level={2}>Privacy Commitment</Heading>
                            <Text>
                                Your data belongs to you. We don't sell your information to third parties, and we minimize data collection to only what's necessary for the service to function. Your privacy is not a premium feature - it's our foundation.
                            </Text>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default About;
