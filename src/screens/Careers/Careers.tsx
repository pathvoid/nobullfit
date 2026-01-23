import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Link } from "@components/link";

const Careers: React.FC = () => {
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
                        <Heading>Careers at NoBullFit</Heading>
                        <Text className="text-lg">
                            Join our mission to revolutionize fitness tracking with privacy at its core
                        </Text>
                    </div>
                    <div className="flex justify-center">
                        <img src="https://cdn.nobull.fit/lemon-job.png" alt="Careers at NoBullFit" className="w-60 h-auto" />
                    </div>
                    <div className="space-y-24">
                        <div className="space-y-6">
                            <Heading level={2}>Why Work With Us</Heading>
                            <Text>
                                At NoBullFit, we're building something different. We believe that health and fitness technology should respect user privacy while delivering exceptional value. Our small but dedicated team is passionate about creating tools that genuinely help people achieve their fitness goals.
                            </Text>
                        </div>
                        <div className="space-y-6">
                            <Heading level={2}>Our Values</Heading>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>Privacy First</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            We put user privacy at the center of every decision we make
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>Transparency</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            We believe in open communication and honest practices
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>User-Centric Design</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            Every feature we build is designed with real user needs in mind
                                        </Text>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                    <div>
                                        <Text>
                                            <Strong>Continuous Learning</Strong>
                                        </Text>
                                        <Text className="text-sm mt-1">
                                            We encourage growth and embrace new technologies and methodologies
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <Heading level={2}>Current Openings</Heading>
                            <div className="border border-zinc-800 rounded-lg p-8 text-center space-y-4">
                                <Text className="text-lg">
                                    <Strong>No Open Positions</Strong>
                                </Text>
                                <Text>
                                    We don't have any open positions at the moment, but we're always interested in hearing from talented individuals who share our passion for privacy-focused fitness technology.
                                </Text>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <Heading level={2}>Stay Connected</Heading>
                            <Text>
                                Even though we don't have current openings, we encourage you to reach out if you believe you'd be a great fit for our team. Send us a message through our <Link href="/contact">contact page</Link> and tell us about yourself. We'll keep your information on file and reach out when opportunities arise that match your skills and experience.
                            </Text>
                            <Text>
                                Follow us to stay updated on future opportunities and company news.
                            </Text>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Careers;
