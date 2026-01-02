import { useLoaderData } from "react-router-dom";
import useHelmet from "@hooks/useHelmet";
import { Heading, Subheading } from "@components/heading";
import { Button } from "@components/button";
import { Text, Strong } from "@components/text";
import { Check } from "lucide-react";
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
                        <Heading>Track nutrition, recipes, and progress - without ads or data selling.</Heading>
                        <Text className="text-xl leading-relaxed">
                            <Strong>NoBullFit</Strong> is a privacy-first health tracking platform for food logging, recipes, grocery lists, weight, and activity. Your data isn’t the product.
                        </Text>
                        <div className="mx-auto max-w-3xl">
                            <div className="grid gap-3 text-left sm:grid-cols-3 sm:gap-4">
                                <div className="flex gap-3 rounded-xl border border-zinc-950/10 bg-white/5 p-4 dark:border-white/10">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Log meals and macros with a clean food diary
                                    </Text>
                                </div>
                                <div className="flex gap-3 rounded-xl border border-zinc-950/10 bg-white/5 p-4 dark:border-white/10">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Build recipes with full nutrition breakdowns
                                    </Text>
                                </div>
                                <div className="flex gap-3 rounded-xl border border-zinc-950/10 bg-white/5 p-4 dark:border-white/10">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Track weight + activities and see trends over time
                                    </Text>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button href="/sign-up">Create a free account</Button>
                            <Button
                                outline
                                href="https://github.com/pathvoid/nobullfit"
                                target="_blank"
                                rel="noopener noreferrer"
                                reloadDocument
                            >
                                View the code on GitHub
                            </Button>
                        </div>
                        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                            Public beta: usable today, improving steadily. No ads. No tracking.
                        </Text>
                    </div>
                    <div className="flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado.png" alt="NoBullFit" className={`w-30 h-auto mx-auto ${styles.parachutingAvocado}`} />
                    </div>
                    <div className="space-y-24">
                        <div className="space-y-8">
                            <Heading level={2} className="text-3xl font-bold text-center">Open & Transparent</Heading>
                            <Text className="leading-relaxed text-center max-w-2xl mx-auto">
                                NoBullFit is <Strong>source-available</Strong>, meaning our code is publicly accessible for transparency and trust. You can review our source to see how we handle your data and build the platform.
                            </Text>
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
                                    Create a free account
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
