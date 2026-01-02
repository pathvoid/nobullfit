import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";
import { Check } from "lucide-react";

const PrivacyFirstCalorieTracker: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Privacy-First Calorie Tracker App (No Ads, No Tracking)</Heading>
                <div className="mt-8 space-y-4">
                    <Text>
                        A <Strong>privacy-first calorie tracker</Strong> prioritizes your data over monetization. If you're looking for a calorie tracker that doesn't sell your data, show ads, or track your behavior, here's what to expect, and what NoBullFit delivers.
                    </Text>
                    <div className="mt-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado-privacy-calories.png" alt="Privacy-first calorie tracker" className="w-full max-w-[300px] h-auto mx-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What "privacy-first" means (in plain terms)</Heading>
                        <Text>
                            "Privacy-first" means privacy is built into the product from the start, not added as an afterthought. For a <Strong>privacy-first calorie tracker</Strong>, this means:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Your data isn't the product. The app makes money through subscriptions or other means, not by selling your information.
                            </Text>
                            <Text>
                                - You have control. You can export your data and delete your account at any time.
                            </Text>
                            <Text>
                                - Transparency. The company is clear about what data is collected and how it's used.
                            </Text>
                            <Text>
                                - Minimal collection. Only data necessary for the service is collected, not everything possible.
                            </Text>
                            <Text>
                                - No dark patterns. The app doesn't trick you into sharing more data or make it hard to opt out.
                            </Text>
                        </div>
                        <Text>
                            This is different from apps that claim privacy but still show ads, use third-party trackers, or make it difficult to delete your data. A <Strong>privacy-first calorie tracker</Strong> treats your health data as sensitive information that deserves protection.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What data a tracker needs, and what it shouldn't collect</Heading>
                        <Text>
                            To function, a calorie tracker needs:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Food logs:</Strong> What you eat, when you eat it, and quantities
                            </Text>
                            <Text>
                                - <Strong>Account information:</Strong> Email and full name for account creation and access
                            </Text>
                            <Text>
                                - <Strong>Progress data:</Strong> Weight, activity, and other metrics you choose to track
                            </Text>
                            <Text>
                                - <Strong>Recipes:</Strong> If you create recipes, the ingredients and nutrition information
                            </Text>
                        </div>
                        <Text>
                            A <Strong>privacy-first calorie tracker</Strong> should not collect:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Location data (unless you explicitly enable location-based features)
                            </Text>
                            <Text>
                                - Device identifiers for advertising purposes
                            </Text>
                            <Text>
                                - Behavioral tracking (what you click, how long you spend on pages, etc.)
                            </Text>
                            <Text>
                                - Data from third-party services unless you explicitly connect them
                            </Text>
                            <Text>
                                - Information about your contacts, photos, or other apps on your device
                            </Text>
                        </div>
                        <Text>
                            The principle is simple: collect what's necessary to provide the service, nothing more. A <Strong>privacy-first calorie tracker</Strong> doesn't use your data to build advertising profiles or sell to data brokers.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>No ads, no third-party trackers, no dark patterns</Heading>
                        <Text>
                            A <Strong>privacy-first calorie tracker</Strong> should have:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>No advertising:</Strong> The app doesn't show ads anywhere, not in the interface, not in emails, not as sponsored content. Ads require tracking, and tracking conflicts with privacy.
                            </Text>
                            <Text>
                                - <Strong>No third-party trackers:</Strong> The app doesn't use analytics services, advertising networks, or other third-party services that collect your data. Analytics, if used, are first-party and anonymized.
                            </Text>
                            <Text>
                                - <Strong>No dark patterns:</Strong> The app doesn't trick you into sharing more data, make privacy settings hard to find, or use manipulative design to keep you engaged. Privacy controls are clear and easy to use.
                            </Text>
                        </div>
                        <Text>
                            Many "free" calorie trackers show ads and use third-party trackers because that's how they make money. A <Strong>privacy-first calorie tracker</Strong> uses a different business model, typically a subscription or one-time payment, so your data isn't monetized.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Food diary + recipes + grocery lists (what you can do)</Heading>
                        <Text>
                            A <Strong>privacy-first calorie tracker</Strong> should still provide full functionality. NoBullFit includes:
                        </Text>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Food Diary</Subheading>
                                <Text>
                                    Log meals and snacks daily, track macros and calories, and see nutrition summaries. The food database includes common foods, and you can add custom foods if needed.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Recipes</Subheading>
                                <Text>
                                    Create recipes with ingredients and get nutrition per serving. Save recipes for easy reuse, and log portions quickly when you eat them.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Grocery Lists</Subheading>
                                <Text>
                                    Generate shopping lists from recipes automatically. Add ingredients from multiple recipes, and the app consolidates quantities. Manage multiple lists for different shopping needs.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Progress Tracking</Subheading>
                                <Text>
                                    Track weight, activities, and see trends over time. View charts and summaries without ads interrupting your data.
                                </Text>
                            </div>
                        </div>
                        <Text>
                            Privacy-first doesn't mean feature-limited. A <Strong>privacy-first calorie tracker</Strong> can provide all the functionality you need while respecting your data.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Export and deletion (what control looks like)</Heading>
                        <Text>
                            A <Strong>privacy-first calorie tracker</Strong> gives you control over your data:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Data export:</Strong> You can export all your data, food logs, recipes, progress data, in JSON format. This lets you keep backups or migrate to another service if needed.
                            </Text>
                            <Text>
                                - <Strong>Account deletion:</Strong> You can delete your account and all associated data at any time. Deletion is permanent and cannot be undone. The app doesn't retain your data after deletion.
                            </Text>
                            <Text>
                                - <Strong>No lock-in:</Strong> Because you can export your data, you're not locked into the service. You can leave anytime without losing your history.
                            </Text>
                        </div>
                        <Text>
                            Control means you own your data. You can take it with you, delete it, or keep using the service, the choice is yours. A <Strong>privacy-first calorie tracker</Strong> makes these options clear and easy to use.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Privacy commitments</Heading>
                        <Text>
                            NoBullFit's privacy commitments as a <Strong>privacy-first calorie tracker</Strong>:
                        </Text>
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
                                        We don't sell or share personal data with third parties
                                    </Text>
                                </li>
                                <li className="flex gap-3">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Export and delete your data anytime
                                    </Text>
                                </li>
                                <li className="flex gap-3">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Minimal collection: only what's needed for the service
                                    </Text>
                                </li>
                                <li className="flex gap-3">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Source-available code for transparency
                                    </Text>
                                </li>
                                <li className="flex gap-3">
                                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                                    <Text className="text-sm/6 text-zinc-600 dark:text-zinc-300">
                                        Clear privacy policy and FAQ
                                    </Text>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Text>
                            If you're looking for a <Strong>privacy-first calorie tracker</Strong> that respects your data, NoBullFit is built with privacy as a core principle.
                        </Text>
                        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                            <Button href="/">
                                Explore NoBullFit
                            </Button>
                            <Button href="/sign-up">
                                Create a free account
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrivacyFirstCalorieTracker;
