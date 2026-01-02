import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";

const TrackMacrosWithRecipes: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>How to Track Macros When You Cook (Recipes + Food Diary)</Heading>
                <div className="mt-8 space-y-4">
                    <Text>
                        If you cook regularly, you know that most nutrition trackers are built for barcode scanning, not recipes. Learning how to <Strong>track macros with recipes</Strong> makes macro tracking sustainable when you're making meals from scratch. Here's a practical approach that works.
                    </Text>
                    <div className="mt-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado-cooking.png" alt="Cooking with recipes" className="w-full max-w-[300px] h-auto mx-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Why cooking is hard in barcode-first apps</Heading>
                        <Text>
                            Most nutrition apps assume you're eating packaged foods with barcodes. When you cook, you run into problems:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>No barcode to scan:</Strong> You made the meal yourself, so there's no product code. You have to manually enter everything.
                            </Text>
                            <Text>
                                - <Strong>Ingredient math is tedious:</Strong> You need to calculate total nutrition for the whole recipe, then divide by servings. This gets complicated fast.
                            </Text>
                            <Text>
                                - <Strong>Inconsistent portions:</Strong> If you make a batch and eat it over several days, you need to log different portions each time. Most apps make this clunky.
                            </Text>
                            <Text>
                                - <Strong>Hard to repeat meals:</Strong> You might make the same recipe weekly, but logging it again means re-entering all the ingredients or finding a saved version buried in your history.
                            </Text>
                        </div>
                        <Text>
                            The result? Many people who cook end up either skipping logging entirely or using rough estimates that aren't accurate. But you can <Strong>track macros with recipes</Strong> effectively if you use a workflow designed for cooking.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Simple workflow: recipe → serving → log portion</Heading>
                        <Text>
                            Here's a straightforward way to <Strong>track macros with recipes</Strong>:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                <Strong>1. Create the recipe once:</Strong> Enter all ingredients with their amounts and provide nutrition information for the whole recipe per serving.
                            </Text>
                            <Text>
                                <Strong>2. Log your portion:</Strong> When you eat the meal, log how many servings you had. The macros are calculated automatically.
                            </Text>
                            <Text>
                                <Strong>3. Save for later:</Strong> The recipe stays in your database. Next time you make it, just log the serving size, no re-entering ingredients.
                            </Text>
                        </div>
                        <Text>
                            This workflow works because you do the math once when creating the recipe, then logging is just "I had 1.5 servings" or "I had 1 serving." Much faster than calculating macros from scratch every time.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Consistency tips: grams, servings, repeat meals</Heading>
                        <Text>
                            To <Strong>track macros with recipes</Strong> accurately and consistently:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Use grams when possible:</Strong> Weight is more accurate than volume (cups, tablespoons). If your recipe says "1 cup of rice," weigh it instead, you'll get more precise macros.
                            </Text>
                            <Text>
                                - <Strong>Standardize serving sizes:</Strong> Pick a consistent way to define servings. If you always make 4 servings from a recipe, stick with that. Or use weight: "one serving = 200g."
                            </Text>
                            <Text>
                                - <Strong>Update recipes when you change them:</Strong> If you modify a recipe (swap an ingredient, adjust amounts), update the saved version so future logs are accurate.
                            </Text>
                            <Text>
                                - <Strong>Use favorites for quick access:</Strong> Save recipes you use frequently as favorites. This makes them easy to find and select when logging, though you'll still need to enter the serving size each time.
                            </Text>
                        </div>
                        <Text>
                            Consistency makes tracking sustainable. When logging is quick and accurate, you're more likely to stick with it long-term.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Example week: logging one recipe multiple times</Heading>
                        <Text>
                            Here's a real example of how to <Strong>track macros with recipes</Strong>:
                        </Text>
                        <Text>
                            <Strong>Sunday:</Strong> You make a batch of chili that serves 6. You create the recipe in the app with all ingredients.
                        </Text>
                        <Text>
                            <Strong>Monday:</Strong> You have 1 serving for dinner. Log: "Chili, 1 serving" → macros logged automatically.
                        </Text>
                        <Text>
                            <Strong>Tuesday:</Strong> You have 1.5 servings for lunch. Log: "Chili, 1.5 servings" → macros calculated automatically.
                        </Text>
                        <Text>
                            <Strong>Wednesday:</Strong> You have 1 serving again. Log: "Chili, 1 serving" → same as Monday, quick to log.
                        </Text>
                        <Text>
                            <Strong>Thursday:</Strong> You finish the batch, maybe 0.8 servings left. Log: "Chili, 0.8 servings" → still accurate.
                        </Text>
                        <Text>
                            Without a recipe system, you'd be manually calculating macros four times for the same meal. With recipes, it's "select recipe, enter serving size" each time. Much faster and more accurate.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Common mistakes (and how to avoid them)</Heading>
                        <Text>
                            When learning to <Strong>track macros with recipes</Strong>, watch out for these pitfalls:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Forgetting to account for cooking changes:</Strong> Some ingredients change weight when cooked (e.g., rice absorbs water). Use cooked weights in your recipe, or be consistent about whether you're logging raw or cooked.
                            </Text>
                            <Text>
                                - <Strong>Not updating when you modify recipes:</Strong> If you swap ingredients or change amounts, update the saved recipe. Otherwise, future logs will be wrong.
                            </Text>
                            <Text>
                                - <Strong>Double-counting ingredients:</Strong> If you log "chicken breast" separately and also log a recipe that includes chicken breast, you're counting it twice. Log the recipe OR the individual ingredients, not both.
                            </Text>
                            <Text>
                                - <Strong>Estimating instead of weighing:</Strong> "One cup" can vary a lot depending on how you measure. Weighing ingredients (especially for calorie-dense foods like oils, nuts, grains) gives you accurate macros.
                            </Text>
                        </div>
                        <Text>
                            The key is building habits that make logging accurate and fast. Once you have a system, tracking macros becomes routine rather than a chore.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Text>
                            Ready to <Strong>track macros with recipes</Strong>? NoBullFit is built for this workflow: create recipes with per-serving nutrition, log portions quickly, and save repeat meals for easy tracking.
                        </Text>
                        <div className="mt-6 flex justify-center">
                            <Button href="/sign-up">
                                Try recipe tracking
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TrackMacrosWithRecipes;
