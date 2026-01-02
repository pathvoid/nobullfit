import { useLoaderData } from "react-router-dom";
import useHelmet from "@hooks/useHelmet";
import { Heading, Subheading } from "@components/heading";
import { Button } from "@components/button";
import { Text, Strong } from "@components/text";
import { Link } from "@components/link";
import { Check } from "lucide-react";
import styles from "./Home.module.scss";

const Home: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
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
                    <div className="flex justify-center my-32">
                        <img src="https://cdn.nobull.fit/avocado.png" alt="NoBullFit" className={`w-30 h-auto mx-auto ${styles.parachutingAvocado}`} />
                    </div>
                    <div className="space-y-48">
                        <div className="space-y-8">
                            <Heading level={2} className="text-3xl font-bold text-center">Transparent by design</Heading>
                            <Text className="leading-relaxed text-center max-w-2xl mx-auto">
                                NoBullFit is <Strong>source-available</Strong>: the code is public so you can understand how the platform works and how data is handled.
                            </Text>
                            <div className="text-center space-y-4">
                                <Link
                                    href="/source-available-vs-open-source-for-health-apps"
                                    className="inline-block font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Read: Source-available vs open source for health apps
                                </Link>
                                <div>
                                    <Button
                                        outline
                                        href="https://github.com/pathvoid/nobullfit"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        reloadDocument
                                    >
                                        View on GitHub
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-12">
                            <div className="text-center space-y-6">
                                <Heading level={2} className="text-3xl font-bold">Everything you need to track — in one place</Heading>
                                <Text className="leading-relaxed max-w-2xl mx-auto">
                                    Designed for clarity and consistency, not streak pressure.
                                </Text>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Food Database</Subheading>
                                    <Text className="leading-relaxed">
                                        Find foods and log them consistently
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Food Tracking</Subheading>
                                    <Text className="leading-relaxed">
                                        Keep a simple daily food diary (meals + snacks)
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Recipe Database</Subheading>
                                    <Text className="leading-relaxed">
                                        Save recipes with nutrition per serving
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Favorites</Subheading>
                                    <Text className="leading-relaxed">
                                        Repeat meals without re-entering everything
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Grocery Lists</Subheading>
                                    <Text className="leading-relaxed">
                                        Plan meals and shop from a clean list
                                    </Text>
                                </div>
                                <div className="space-y-6">
                                    <Subheading className="text-xl font-semibold">Progress Tracking</Subheading>
                                    <Text className="leading-relaxed">
                                        Weight trends, activities, and daily nutrition
                                    </Text>
                                </div>
                            </div>
                            <div className="pt-2 text-center space-y-3">
                                <Link
                                    href="/myfitnesspal-alternative-without-ads-or-data-selling"
                                    className="block font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    MyFitnessPal alternative without ads or data selling
                                </Link>
                                <Link
                                    href="/track-macros-with-recipes"
                                    className="block font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Cooking a lot?
                                </Link>
                            </div>
                        </div>
                        <div className="space-y-10">
                            <div className="text-center space-y-6">
                                <Heading level={2} className="text-3xl font-bold">From recipe to grocery list to logged meal</Heading>
                            </div>
                            <div className="mx-auto max-w-4xl">
                                <ol className="grid gap-4 text-left md:grid-cols-3">
                                    <li className="rounded-xl border border-zinc-950/10 bg-white/5 p-5 dark:border-white/10">
                                        <Subheading className="text-base font-semibold">1. Create or save a recipe</Subheading>
                                    </li>
                                    <li className="rounded-xl border border-zinc-950/10 bg-white/5 p-5 dark:border-white/10">
                                        <Subheading className="text-base font-semibold">2. Add ingredients to a grocery list</Subheading>
                                    </li>
                                    <li className="rounded-xl border border-zinc-950/10 bg-white/5 p-5 dark:border-white/10">
                                        <Subheading className="text-base font-semibold">3. Log a serving and automatically track nutrition</Subheading>
                                    </li>
                                </ol>
                                <div className="mt-6 text-center">
                                    <Link
                                        href="/grocery-list-from-recipes-app"
                                        className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        See how it works: Grocery list from recipes app
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="text-center space-y-6">
                                <Subheading>Privacy is the baseline</Subheading>
                                <Heading level={2} className="text-3xl font-bold">Privacy by default (not a premium feature)</Heading>
                                <Text className="leading-relaxed max-w-2xl mx-auto">
                                    Most health apps are funded by attention and advertising. NoBullFit is built to respect your data and your time.
                                </Text>
                            </div>
                            <div className="mx-auto max-w-3xl">
                                <ul className="grid gap-3 text-left sm:grid-cols-2 sm:gap-4">
                                    <li className="flex gap-3">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            No advertising and no behavioral tracking
                                        </Text>
                                    </li>
                                    <li className="flex gap-3">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            We don’t sell or share personal data with third parties
                                        </Text>
                                    </li>
                                    <li className="flex gap-3">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            Export and delete your data (so you can leave anytime)
                                        </Text>
                                    </li>
                                    <li className="flex gap-3">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            Minimal collection: only what’s needed to provide the service
                                        </Text>
                                    </li>
                                </ul>
                                <div className="mt-6 text-center">
                                    <Link
                                        href="/privacy-nutrition-app-faq"
                                        className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        Learn more: Privacy nutrition app FAQ
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="text-center space-y-6">
                                <Heading level={2} className="text-3xl font-bold">Built for people who want control</Heading>
                            </div>
                            <div className="mx-auto max-w-3xl">
                                <ul className="grid gap-3 text-left sm:grid-cols-2 sm:gap-4">
                                    <li className="flex gap-3">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            You want to track food and progress without becoming a data product
                                        </Text>
                                    </li>
                                    <li className="flex gap-3">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            You prefer calm tracking over gamification and streak pressure
                                        </Text>
                                    </li>
                                    <li className="flex gap-3 sm:col-span-2">
                                        <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                        <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                            You want the option to export or delete your data anytime
                                        </Text>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="text-center space-y-8">
                            <Heading level={2} className="text-3xl font-bold">Get started in under a minute</Heading>
                            <Text className="text-lg max-w-2xl mx-auto">
                                Create an account and log your first meal. If it’s not for you, you can delete your data.
                            </Text>
                            <div className="flex justify-center">
                                <Button href="/sign-up">
                                    Create a free account
                                </Button>
                            </div>
                            <div className="text-center">
                                <Link
                                    href="/privacy-first-calorie-tracker"
                                    className="inline-block font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Read the details: Privacy-first calorie tracker
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;
