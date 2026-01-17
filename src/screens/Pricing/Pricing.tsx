import useHelmet from "@hooks/useHelmet";
import { useLoaderData, Link } from "react-router-dom";
import { Heading } from "@components/heading";
import { Text, Strong, TextLink } from "@components/text";
import { Badge } from "@components/badge";
import { Divider } from "@components/divider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Check, X, Sparkles, Heart, Shield, Download, Clock, HelpCircle } from "lucide-react";

// Feature list item component for cleaner rendering
const FeatureItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="flex items-start gap-3">
        <Check className="size-5 text-emerald-500 shrink-0 mt-0.5" />
        <Text className="!mt-0">{children}</Text>
    </li>
);

const Pricing: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <div className="max-w-4xl mx-auto space-y-16 px-4">
                    {/* Header */}
                    <div className="text-center space-y-6">
                        <Heading>Simple, Honest Pricing</Heading>
                        <Text className="text-lg max-w-2xl mx-auto">
                            NoBullFit is built to be <Strong>free-first</Strong>. We believe privacy and comprehensive health tracking 
                            shouldn't be premium features. Everything you need to track your nutrition and fitness is available at no cost.
                        </Text>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Free Plan */}
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 space-y-6 bg-white dark:bg-zinc-900">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Heading level={2}>Free</Heading>
                                    <Badge color="emerald">Available Now</Badge>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-zinc-900 dark:text-white">$0</span>
                                    <span className="text-zinc-500 dark:text-zinc-400">/ forever</span>
                                </div>
                                <Text>Everything you need to take control of your health journey.</Text>
                            </div>

                            <Divider soft />

                            <ul className="space-y-3">
                                <FeatureItem>Full food database with detailed nutrition data</FeatureItem>
                                <FeatureItem>Unlimited daily food tracking</FeatureItem>
                                <FeatureItem>Create and share recipes with the community</FeatureItem>
                                <FeatureItem>Grocery list management</FeatureItem>
                                <FeatureItem>Activity and exercise logging</FeatureItem>
                                <FeatureItem>Weight tracking with trends</FeatureItem>
                                <FeatureItem>TDEE and BMR calculator</FeatureItem>
                                <FeatureItem>Dashboard analytics with charts</FeatureItem>
                                <FeatureItem>PDF health reports</FeatureItem>
                                <FeatureItem>Full data export (JSON)</FeatureItem>
                                <FeatureItem>No ads, ever</FeatureItem>
                            </ul>
                        </div>

                        {/* Pro Plan */}
                        <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 p-8 space-y-6 bg-blue-50/50 dark:bg-blue-950/20 relative">
                            <div className="absolute -top-3 right-6">
                                <Badge color="blue">Most Popular</Badge>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Heading level={2}>Pro</Heading>
                                    <Sparkles className="size-5 text-blue-500" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-zinc-900 dark:text-white">$10</span>
                                    <span className="text-zinc-500 dark:text-zinc-400">/ month</span>
                                </div>
                                <Text>Quality-of-life features for power users who want extra convenience.</Text>
                            </div>

                            <Divider soft />

                            <div className="space-y-4">
                                <Text className="font-medium text-zinc-700 dark:text-zinc-300">
                                    Everything in Free, plus:
                                </Text>
                                <ul className="space-y-3">
                                    <FeatureItem>Plan meals for future days and weeks</FeatureItem>
                                    <FeatureItem>Copy entire days or weeks of meals</FeatureItem>
                                    <FeatureItem>Drag-and-drop meal organization</FeatureItem>
                                    <FeatureItem>Plan activities for future days</FeatureItem>
                                    <FeatureItem>Copy entire days or weeks of activities</FeatureItem>
                                    <FeatureItem>Set weight goals (lose, maintain, gain)</FeatureItem>
                                    <FeatureItem>Personalized macro recommendations</FeatureItem>
                                    <FeatureItem>Goal timeline projections</FeatureItem>
                                    <FeatureItem>Weekly progress insights</FeatureItem>
                                    <li className="flex items-start gap-3">
                                        <Sparkles className="size-5 text-blue-500 shrink-0 mt-0.5" />
                                        <Text className="!mt-0 italic text-zinc-500 dark:text-zinc-400">And more features coming soon...</Text>
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-4">
                                <Link 
                                    to="/sign-up" 
                                    className="block w-full text-center py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                                >
                                    Get Started with Pro
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Philosophy Section */}
                    <div className="space-y-8">
                        <Divider />
                        
                        <div className="text-center space-y-4">
                            <Heading level={2}>Why Free-First?</Heading>
                            <Text className="max-w-2xl mx-auto">
                                We believe everyone deserves access to quality health tracking tools without paying a premium 
                                or sacrificing their privacy. That's why <Strong>all essential features are free</Strong> and always will be.
                            </Text>
                        </div>

                        <div className="grid sm:grid-cols-3 gap-6">
                            <div className="text-center space-y-3 p-6">
                                <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                    <Shield className="size-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <Heading level={3}>Privacy by Default</Heading>
                                <Text className="text-sm">
                                    No ads, no data selling, no behavioral tracking. Your health data stays yours.
                                </Text>
                            </div>

                            <div className="text-center space-y-3 p-6">
                                <div className="inline-flex items-center justify-center size-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                                    <Download className="size-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <Heading level={3}>Full Data Control</Heading>
                                <Text className="text-sm">
                                    Export all your data anytime. Delete it whenever you want. No questions asked.
                                </Text>
                            </div>

                            <div className="text-center space-y-3 p-6">
                                <div className="inline-flex items-center justify-center size-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                    <Clock className="size-6 text-amber-600 dark:text-amber-400" />
                                </div>
                                <Heading level={3}>No Paywalls</Heading>
                                <Text className="text-sm">
                                    Pro features are conveniences, not necessities. You'll never hit a paywall for core functionality.
                                </Text>
                            </div>
                        </div>
                    </div>

                    {/* Supporting the Project */}
                    <div className="space-y-6">
                        <Divider />
                        
                        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <Heart className="size-6 text-rose-500" />
                                <Heading level={3}>Where Does the Money Go?</Heading>
                            </div>
                            <Text>
                                Running a free service isn't free for us. Servers, databases, APIs, email delivery, 
                                and image storage all cost money. When Pro subscriptions become available, your support will go directly 
                                toward <Strong>keeping NoBullFit online and ad-free</Strong> for everyone—including free users.
                            </Text>
                            <Text>
                                We're committed to transparency. NoBullFit is <TextLink href="https://github.com/pathvoid/nobullfit">source-available on GitHub</TextLink>, 
                                so you can see exactly how your data is handled and how the platform works.
                            </Text>
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="space-y-6">
                        <Divider />
                        
                        <div className="text-center space-y-4">
                            <Heading level={2}>How We Compare</Heading>
                            <Text className="max-w-2xl mx-auto">
                                See how NoBullFit stacks up against other popular health tracking apps.
                            </Text>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader>Feature</TableHeader>
                                        <TableHeader className="text-center">NoBullFit</TableHeader>
                                        <TableHeader className="text-center">MyFitnessPal</TableHeader>
                                        <TableHeader className="text-center">Cronometer</TableHeader>
                                        <TableHeader className="text-center">LoseIt</TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Free tier</TableCell>
                                        <TableCell className="text-center">Full features</TableCell>
                                        <TableCell className="text-center text-zinc-500">Limited</TableCell>
                                        <TableCell className="text-center text-zinc-500">Limited</TableCell>
                                        <TableCell className="text-center text-zinc-500">Limited</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">No ads</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">No data selling</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><HelpCircle className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Source-available</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Recipe creation</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Public recipe sharing</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Recipe → Grocery list</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">PDF reports</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center text-zinc-500">Paid</TableCell>
                                        <TableCell className="text-center"><X className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Data export</TableCell>
                                        <TableCell className="text-center">Full JSON</TableCell>
                                        <TableCell className="text-center text-zinc-500">Limited</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center text-zinc-500">Limited</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Full data deletion</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><HelpCircle className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><HelpCircle className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><HelpCircle className="size-5 text-zinc-400 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">TDEE calculator</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Activity tracking</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Weight tracking</TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                        <TableCell className="text-center"><Check className="size-5 text-emerald-500 mx-auto" /></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center space-y-4">
                        <Heading level={2}>Ready to Start?</Heading>
                        <Text>
                            Create your free account and start tracking your health journey today. 
                            No credit card required, no trial period—just sign up and go.
                        </Text>
                        <div className="pt-2">
                            <Link 
                                to="/sign-up" 
                                className="inline-flex items-center gap-2 text-lg font-medium text-zinc-950 dark:text-white hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                                Create Free Account →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Pricing;
