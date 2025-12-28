import { useLoaderData } from "react-router-dom";
import useHelmet from "@hooks/useHelmet";
import { Heading, Subheading } from "@components/heading";
import { Button } from "@components/button";
import { Text, Strong } from "@components/text";
import styles from "./Home.module.scss";

const Home: React.FC = () => {
    const loaderData = useLoaderData() as { data: string; title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <div className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center space-y-8">
                        <Heading>Transform Your Health Journey</Heading>
                        <Text className="text-xl leading-relaxed">
                            <Strong>NoBullFit</Strong> is a comprehensive privacy-first platform designed to help you track your nutrition, discover recipes, manage grocery lists, and monitor your health progress — all without compromising your data.
                        </Text>
                        <Text className="text-lg">
                            This project is currently in <Strong>early development</Strong>, but it's already publicly available. You're welcome to explore and use the features, all completely free.
                        </Text>
                    </div>
                    <div className="flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado.png" alt="NoBullFit" className={`w-30 h-auto mx-auto ${styles.parachutingAvocado}`} />
                    </div>
                    <div className="space-y-24">
                        <div className="space-y-8">
                            <Heading level={2} className="text-3xl font-bold text-center">Open & Transparent</Heading>
                            <Text className="leading-relaxed text-center max-w-2xl mx-auto">
                                NoBullFit is <Strong>source-available</Strong>, meaning our code is publicly accessible for transparency and trust. You can view our source code to understand how we handle your data and build our platform.
                            </Text>
                            <div className="text-center">
                                <a 
                                    href="https://github.com/pathvoid/nobullfit" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="relative isolate inline-flex items-baseline justify-center gap-x-2 rounded-lg border text-base/6 font-semibold px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6 focus:outline-hidden focus:outline-2 focus:outline-offset-2 focus:outline-blue-500 border-transparent bg-zinc-950/90 dark:bg-zinc-600 before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-lg)-1px)] before:bg-zinc-900 before:shadow-sm dark:before:hidden dark:border-white/5 after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-lg)-1px)] after:shadow-[inset_0_1px_--theme(--color-white/15%)] hover:after:bg-white/10 active:after:bg-white/10 dark:after:-inset-px dark:after:rounded-lg text-white hover:text-white dark:text-white"
                                >
                                    View on GitHub
                                </a>
                            </div>
                        </div>
                        <div className="space-y-12">
                            <Heading level={2} className="text-3xl font-bold text-center">What You Can Do</Heading>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Food Database</Subheading>
                                    <Text className="leading-relaxed">
                                        Browse a comprehensive database of foods with detailed nutritional information to make informed dietary choices.
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Food Tracking</Subheading>
                                    <Text className="leading-relaxed">
                                        Log your daily meals and snacks to track your nutrition intake and maintain a detailed food diary.
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Recipe Database</Subheading>
                                    <Text className="leading-relaxed">
                                        Discover and save recipes with complete nutritional breakdowns and ingredient lists.
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Favorites</Subheading>
                                    <Text className="leading-relaxed">
                                        Save your favorite foods and recipes for quick access and easy meal planning.
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Grocery Lists</Subheading>
                                    <Text className="leading-relaxed">
                                        Create and manage multiple grocery lists. Perfect for meal planning and shopping.
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Progress Tracking</Subheading>
                                    <Text className="leading-relaxed">
                                        Monitor your health journey with comprehensive tracking:
                                    </Text>
                                    <ul className="list-disc list-inside space-y-3 ml-4">
                                        <li className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">Weight tracking and trends</li>
                                        <li className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">Activity logging</li>
                                        <li className="text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400">Daily nutrition tracking</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <Heading level={2} className="text-3xl font-bold text-center">Built with Privacy in Mind</Heading>
                            <Text className="leading-relaxed text-center max-w-2xl mx-auto">
                                Unlike many health apps, we don't collect unnecessary data and we <Strong>never</Strong> sell your personal information. NoBullFit is and always will be a <em>privacy-first</em> platform.
                            </Text>
                        </div>
                        <div className="text-center space-y-10">
                            <Heading level={2} className="text-3xl font-bold">Get Started</Heading>
                            <Text className="text-lg">
                                Ready to explore?
                            </Text>
                            <div className="flex justify-center">
                                <Button href="/sign-up">
                                    Sign Up Now!
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;
