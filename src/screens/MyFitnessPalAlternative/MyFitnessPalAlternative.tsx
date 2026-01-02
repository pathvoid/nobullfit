import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";
import { Link } from "@components/link";

const MyFitnessPalAlternative: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>MyFitnessPal Alternative Without Ads or Data Selling</Heading>
                <div className="mt-8 space-y-4">
                    <Text>
                        If you're looking for a <Strong>MyFitnessPal alternative privacy</Strong>-focused option, you've probably noticed that most "free" nutrition trackers come with ads, tracking, and data selling. NoBullFit is built differently: no ads, no behavioral tracking, and your data isn't the product.
                    </Text>
                    <div className="mt-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado-privacy-app.png" alt="Privacy-first health app" className="w-full max-w-[300px] h-auto mx-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Why many "free" trackers rely on ads and tracking</Heading>
                        <Text>
                            Most free health apps need to make money somehow. The common approaches are:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Advertising revenue:</Strong> Apps show ads between meals, in your food log, or as banner placements. These ads are often targeted based on your data.
                            </Text>
                            <Text>
                                - <Strong>Data selling:</Strong> Your food logs, weight trends, and activity data can be valuable to advertisers, data brokers, or health companies. Some apps sell anonymized or aggregated data.
                            </Text>
                            <Text>
                                - <Strong>Premium upsells:</Strong> Free versions are intentionally limited to push you toward paid subscriptions. Sometimes core features are locked behind paywalls.
                            </Text>
                            <Text>
                                - <Strong>Affiliate partnerships:</Strong> Apps may earn commissions when you buy products they recommend or link to.
                            </Text>
                        </div>
                        <Text>
                            This isn't inherently wrong, businesses need revenue, but it means your data and attention become part of the business model. If you're looking for a <Strong>MyFitnessPal alternative privacy</Strong>-first approach, you want an app that doesn't monetize your personal information.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What to look for in a privacy-first alternative</Heading>
                        <Text>
                            When evaluating a <Strong>MyFitnessPal alternative privacy</Strong>-focused option, check for:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>No advertising:</Strong> The app shouldn't show ads anywhere, not in the interface, not in emails, not as sponsored content.
                            </Text>
                            <Text>
                                - <Strong>Clear privacy policy:</Strong> Look for explicit statements that data isn't sold or shared with third parties for advertising purposes.
                            </Text>
                            <Text>
                                - <Strong>Data export:</Strong> You should be able to export your data in a standard format (JSON) so you can leave anytime without losing your history.
                            </Text>
                            <Text>
                                - <Strong>Account deletion:</Strong> There should be a straightforward way to delete your account and all associated data.
                            </Text>
                            <Text>
                                - <Strong>Transparent business model:</Strong> If the app is free, understand how it makes money. If it's paid, the pricing should be clear and reasonable.
                            </Text>
                            <Text>
                                - <Strong>Source-available code:</Strong> Ideally, you can review the code to verify privacy claims. This isn't always possible, but it's a strong signal.
                            </Text>
                        </div>
                        <Text>
                            NoBullFit checks all these boxes: no ads, no data selling, full export and deletion options, and our code is publicly available for review.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>NoBullFit vs MyFitnessPal: food log, recipes, grocery lists, weight/activity</Heading>
                        <Text>
                            Here's how NoBullFit compares to MyFitnessPal across key features:
                        </Text>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Food Log</Subheading>
                                <Text>
                                    Both apps let you log meals and track macros. NoBullFit focuses on simplicity: a clean daily food diary without gamification or streak pressure. MyFitnessPal has a larger food database, but NoBullFit's database is growing and you can add custom foods easily.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Recipes</Subheading>
                                <Text>
                                    Both support recipe creation with nutrition per serving. NoBullFit lets you build recipes from scratch and save them to your database. MyFitnessPal has more user-submitted recipes, but many include ads or sponsored content.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Grocery Lists</Subheading>
                                <Text>
                                    NoBullFit includes integrated grocery list functionality, you can add ingredients from recipes directly to a shopping list. MyFitnessPal doesn't have built-in grocery lists, though some users work around this with notes or external apps.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Weight and Activity Tracking</Subheading>
                                <Text>
                                    Both apps track weight and activities over time. NoBullFit shows trends and charts without pushing premium features. MyFitnessPal has more integrations with fitness devices, but many advanced features require a premium subscription.
                                </Text>
                            </div>
                        </div>
                        <Text>
                            The main difference isn't just features, it's the experience. NoBullFit is designed to be calm and focused, without ads interrupting your tracking or pressure to maintain streaks. If you want a <Strong>MyFitnessPal alternative privacy</Strong>-first experience, NoBullFit prioritizes your data over monetization.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Who NoBullFit is best for</Heading>
                        <Text>
                            NoBullFit works well if you:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Want to track food and macros without ads or distractions
                            </Text>
                            <Text>
                                - Value privacy and don't want your health data sold or shared
                            </Text>
                            <Text>
                                - Prefer simple, focused tracking over gamification
                            </Text>
                            <Text>
                                - Want the option to export or delete your data anytime
                            </Text>
                            <Text>
                                - Are comfortable with a smaller but growing food database (you can add custom foods)
                            </Text>
                            <Text>
                                - Want integrated recipe and grocery list features
                            </Text>
                        </div>
                        <Text>
                            NoBullFit might not be the best fit if you:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Need extensive fitness device integrations (we're working on this)
                            </Text>
                            <Text>
                                - Want a massive pre-populated food database (ours is growing, but you may need to add more custom foods)
                            </Text>
                            <Text>
                                - Prefer gamification, challenges, or social features
                            </Text>
                            <Text>
                                - Need advanced meal planning or macro coaching features
                            </Text>
                        </div>
                        <Text>
                            If you're looking for a <Strong>MyFitnessPal alternative privacy</Strong>-focused option that respects your data, NoBullFit is worth trying.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>FAQs</Heading>
                        <div className="space-y-4">
                            <div>
                                <Subheading>What data does NoBullFit collect?</Subheading>
                                <Text>
                                    We collect only what's necessary to provide the service: your email (for account creation), food logs, recipes, weight entries, and activity data. We don't collect location data, device identifiers for advertising, or behavioral tracking data. See our <Link href="/privacy-policy" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Privacy Policy</Link> for full details.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Can I export my data?</Subheading>
                                <Text>
                                    Yes. You can export all your data, food logs, recipes, weight entries, activities, in JSON format from your settings. This lets you keep a backup or migrate to another service if needed.
                                </Text>
                            </div>
                            <div>
                                <Subheading>How do I delete my account?</Subheading>
                                <Text>
                                    You can delete your account and all associated data from your settings page. This is permanent and cannot be undone. We don't retain your data after deletion.
                                </Text>
                            </div>
                            <div>
                                <Subheading>How does NoBullFit make money?</Subheading>
                                <Text>
                                    NoBullFit is currently free to use. We're exploring sustainable business models that don't involve ads or data selling, likely a reasonable subscription fee for advanced features in the future, while keeping core tracking free. We're committed to transparency about any changes.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Is NoBullFit open source?</Subheading>
                                <Text>
                                    NoBullFit is source-available: our code is public on GitHub so you can review how we handle your data. You can review it and report issues, but the codebase is read-only and remains under our control. See our page on <Link href="/source-available-vs-open-source-for-health-apps" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">source-available vs open source</Link> for more details.
                                </Text>
                            </div>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Text>
                            Ready to try a <Strong>MyFitnessPal alternative privacy</Strong>-first approach? Create an account and start tracking—no credit card required, and you can delete your data anytime.
                        </Text>
                        <div className="mt-6 flex justify-center">
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

export default MyFitnessPalAlternative;
