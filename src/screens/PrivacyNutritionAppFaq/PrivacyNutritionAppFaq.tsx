import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";
import { Link } from "@components/link";

const PrivacyNutritionAppFaq: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Privacy FAQ for Nutrition Apps (What You Should Expect)</Heading>
                <div className="mt-8 space-y-4">
                    <Text>
                        This <Strong>privacy nutrition app FAQ</Strong> answers common questions about how NoBullFit handles your data. If you're evaluating nutrition apps, these are the questions you should ask, and the answers you should expect.
                    </Text>
                    <div className="mt-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado-privacy-nutrition.png" alt="Privacy nutrition app FAQ" className="w-full max-w-[300px] h-auto mx-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What data NoBullFit collects</Heading>
                        <Text>
                            NoBullFit collects the following data:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Account information:</Strong> Email address, full name, and optional country (required for account creation)
                            </Text>
                            <Text>
                                - <Strong>Food logs:</Strong> Meals and foods you log, including dates, times, and quantities
                            </Text>
                            <Text>
                                - <Strong>Recipes:</Strong> Recipes you create, including ingredients and nutrition information
                            </Text>
                            <Text>
                                - <Strong>Progress data:</Strong> Weight entries, activity logs, and other tracking data you enter
                            </Text>
                            <Text>
                                - <Strong>Preferences:</Strong> Settings and preferences you configure in the app
                            </Text>
                            <Text>
                                - <Strong>Technical data:</Strong> IP address and browser type (collected automatically server-side for security and functionality, allowing us to ban certain IPs from abusing our systems)
                            </Text>
                        </div>
                        <Text>
                            We do not collect:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Location data (unless you explicitly enable location-based features)
                            </Text>
                            <Text>
                                - Device identifiers for advertising purposes
                            </Text>
                            <Text>
                                - Behavioral tracking data (what you click, how long you spend on pages, etc.)
                            </Text>
                            <Text>
                                - Data from third-party services unless you explicitly connect them
                            </Text>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>What that data is used for (and what it is not used for)</Heading>
                        <Text>
                            Your data is used for:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Providing the service:</Strong> Storing your food logs, recipes, and progress data so you can access them
                            </Text>
                            <Text>
                                - <Strong>Calculating nutrition:</Strong> Computing macros, calories, and other nutrition metrics based on your entries
                            </Text>
                            <Text>
                                - <Strong>Displaying your information:</Strong> Showing your data back to you in charts, lists, and summaries
                            </Text>
                            <Text>
                                - <Strong>Account management:</Strong> Authentication, password reset, email notifications about your account
                            </Text>
                            <Text>
                                - <Strong>Security:</Strong> Detecting and preventing unauthorized access, fraud, or abuse
                            </Text>
                            <Text>
                                - <Strong>Service improvement:</Strong> Understanding how features are used (aggregated, anonymized data) to improve the app
                            </Text>
                        </div>
                        <Text>
                            Your data is not used for:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Advertising or marketing to you
                            </Text>
                            <Text>
                                - Selling to third parties
                            </Text>
                            <Text>
                                - Building advertising profiles
                            </Text>
                            <Text>
                                - Sharing with data brokers or analytics companies for advertising purposes
                            </Text>
                            <Text>
                                - Training AI models on your personal data
                            </Text>
                        </div>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Does NoBullFit sell or share data?</Heading>
                        <Text>
                            No. NoBullFit does not sell your personal data to third parties. We do not share your personal data with advertisers, data brokers, or marketing companies.
                        </Text>
                        <Text>
                            We may share data only in these limited circumstances:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Legal requirements:</Strong> If required by law or court order, we may disclose data. We will notify you if legally permitted.
                            </Text>
                            <Text>
                                - <Strong>Business transfers:</Strong> If NoBullFit is acquired or merged, data may transfer to the new entity under the same privacy commitments.
                            </Text>
                        </div>
                        <Text>
                            We do not share aggregated or anonymized data in a way that could identify you individually.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>How export works (what format, what you get)</Heading>
                        <Text>
                            You can export all your data from your account settings. The export includes:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Food logs:</Strong> All meals and foods you've logged, with dates, times, and nutrition information
                            </Text>
                            <Text>
                                - <Strong>Recipes:</Strong> All recipes you've created, including ingredients and nutrition per serving
                            </Text>
                            <Text>
                                - <Strong>Progress data:</Strong> Weight entries, activity logs, and other tracking data
                            </Text>
                            <Text>
                                - <Strong>Favorites:</Strong> Your saved favorite foods and recipes
                            </Text>
                            <Text>
                                - <Strong>Grocery lists:</Strong> All your grocery lists with items and quantities
                            </Text>
                            <Text>
                                - <Strong>TDEE data:</Strong> Your calculated TDEE (Total Daily Energy Expenditure) if you've set it up
                            </Text>
                            <Text>
                                - <Strong>Account information:</Strong> Email address, full name, country, account creation date, and terms acceptance
                            </Text>
                        </div>
                        <Text>
                            Format: Data is exported in JSON format, a structured data format useful for importing into other apps or systems. You can convert JSON to CSV using spreadsheet applications or online tools if needed.
                        </Text>
                        <Text>
                            Exports are generated on-demand and include all data associated with your account. You can request an export at any time, and there are no limits on how often you can export.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>How deletion works (account + time ranges, if applicable)</Heading>
                        <Text>
                            You can delete your account and all associated data from your account settings. When you delete your account:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - All food logs are permanently deleted
                            </Text>
                            <Text>
                                - All recipes are permanently deleted
                            </Text>
                            <Text>
                                - All progress data (weight, activities) is permanently deleted
                            </Text>
                            <Text>
                                - Your account information (email, full name) is permanently deleted
                            </Text>
                            <Text>
                                - All preferences and settings are permanently deleted
                            </Text>
                        </div>
                        <Text>
                            Deletion is permanent and cannot be undone. We do not retain backups of deleted accounts. Once deletion is complete, your data cannot be recovered.
                        </Text>
                        <Text>
                            Timeline: Account deletion is processed immediately. All data is permanently deleted from active systems. Backups are purged within 30 days.
                        </Text>
                        <Text>
                            Partial deletion: You can delete specific data types and time ranges (last 7 days, last 30 days, or all) without deleting your entire account. This is available in your account settings and allows you to remove food logs, recipes, progress data, weight tracking, or TDEE data selectively.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Security basics (high-level, no buzzwords)</Heading>
                        <Text>
                            NoBullFit implements standard security practices:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Encryption:</Strong> Data is encrypted in transit (HTTPS) and at rest (database encryption)
                            </Text>
                            <Text>
                                - <Strong>Authentication:</Strong> Passwords are hashed using industry-standard algorithms. We support password reset via email.
                            </Text>
                            <Text>
                                - <Strong>Access controls:</Strong> Only authorized systems and personnel can access user data, and only for necessary purposes
                            </Text>
                            <Text>
                                - <Strong>Regular updates:</Strong> We keep software dependencies updated to address security vulnerabilities
                            </Text>
                            <Text>
                                - <Strong>Monitoring:</Strong> We monitor for unauthorized access attempts and suspicious activity
                            </Text>
                        </div>
                        <Text>
                            We do not claim to be "military-grade" or "bank-level" secure. We use standard, proven security practices appropriate for a health data application. No system is 100% secure, but we take reasonable measures to protect your data.
                        </Text>
                        <Text>
                            If you discover a security vulnerability, please report it to support@nobull.fit. We take security issues seriously and will address them promptly.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Contact and transparency</Heading>
                        <Text>
                            If you have questions about privacy or data handling:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Email:</Strong> support@nobull.fit
                            </Text>
                            <Text>
                                - <Strong>Privacy Policy:</Strong> Full legal details are available in our <Link href="/privacy-policy" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Privacy Policy</Link>
                            </Text>
                            <Text>
                                - <Strong>Source code:</Strong> Our code is publicly available on GitHub for review
                            </Text>
                        </div>
                        <Text>
                            We are transparent about our practices. If our privacy practices change in ways that affect how we handle your data, we will notify users and update this FAQ and our <Link href="/privacy-policy" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Privacy Policy</Link>.
                        </Text>
                        <Text>
                            This <Strong>privacy nutrition app FAQ</Strong> reflects our current practices. For the most up-to-date information, refer to our <Link href="/privacy-policy" className="font-semibold text-blue-600 underline underline-offset-4 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">Privacy Policy</Link>, which is the authoritative document.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Text>
                            If you're looking for a nutrition app that respects your privacy, NoBullFit is built with privacy as a core principle, not an afterthought.
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

export default PrivacyNutritionAppFaq;
