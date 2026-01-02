import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { Heading, Subheading } from "@components/heading";
import { Text, Strong } from "@components/text";
import { Button } from "@components/button";

const GroceryListFromRecipesApp: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();

    // Set helmet values - refs are updated synchronously for SSR, state updates are deferred
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    return (
        <>
            <div className="py-16">
                <Heading>Build a Grocery List From Recipes (Meal Prep Without Friction)</Heading>
                <div className="mt-8 space-y-4">
                    <Text>
                        Meal prep starts with planning what you'll cook, but it often breaks down when you're manually copying ingredients from recipes into a shopping list. A <Strong>grocery list from recipes app</Strong> connects recipes directly to your shopping list, so you can plan meals and shop efficiently without the friction.
                    </Text>
                    <div className="mt-8 flex justify-center">
                        <img src="https://cdn.nobull.fit/avocado-grocery.png" alt="Grocery list from recipes" className="w-full max-w-[300px] h-auto mx-auto" />
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Why grocery-list + recipe linking matters</Heading>
                        <Text>
                            Most people plan meals by:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - Writing down recipes they want to make
                            </Text>
                            <Text>
                                - Manually copying ingredients into a shopping list
                            </Text>
                            <Text>
                                - Trying to remember what they already have
                            </Text>
                            <Text>
                                - Realizing at the store they forgot something or bought duplicates
                            </Text>
                        </div>
                        <Text>
                            This process is tedious and error-prone. A <Strong>grocery list from recipes app</Strong> solves this by letting you add ingredients from your saved recipes directly to a shopping list. When you select a recipe and add it to your grocery list, its ingredients are added with quantities calculated automatically.
                        </Text>
                        <Text>
                            The benefits:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>No manual copying:</Strong> Ingredients are added automatically when you select recipes
                            </Text>
                            <Text>
                                - <Strong>Accurate quantities:</Strong> The app knows how much you need based on the recipe, so you buy the right amount
                            </Text>
                            <Text>
                                - <Strong>Consolidation:</Strong> If multiple recipes use the same ingredient, quantities are combined automatically
                            </Text>
                            <Text>
                                - <Strong>Less waste:</Strong> You buy what you need, not what you guess
                            </Text>
                            <Text>
                                - <Strong>Faster shopping:</Strong> A well-organized list means less time wandering the aisles
                            </Text>
                        </div>
                        <Text>
                            When recipes and grocery lists are connected, meal prep becomes smoother from planning to shopping to cooking.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Step-by-step: recipe → ingredients → grocery list</Heading>
                        <Text>
                            Here's how a <Strong>grocery list from recipes app</Strong> works in practice:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                <Strong>1. Create or select recipes:</Strong> Start with recipes you want to make. These can be recipes you've saved before, or new ones you're creating.
                            </Text>
                            <Text>
                                <Strong>2. Add recipes to your grocery list:</Strong> Select a recipe and add it to your grocery list.
                            </Text>
                            <Text>
                                <Strong>3. Ingredients are added automatically:</Strong> All ingredients from the recipe are added to your grocery list, with quantities combined if you add the same recipe multiple times or if multiple recipes use the same ingredient.
                            </Text>
                            <Text>
                                <Strong>4. Review and adjust:</Strong> Check the list, remove items you already have, adjust quantities if needed, or add any extras manually.
                            </Text>
                            <Text>
                                <Strong>5. Shop:</Strong> Use the organized list at the store. You can also receive your grocery list by email.
                            </Text>
                        </div>
                        <Text>
                            This workflow eliminates the manual step of copying ingredients. You select recipes, and their ingredients are added to your shopping list with quantities calculated automatically. When you're ready to cook, the recipes are already saved, so logging meals is quick too.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Managing multiple lists (weekly, staples, bulk)</Heading>
                        <Text>
                            A good <Strong>grocery list from recipes app</Strong> lets you manage different types of shopping:
                        </Text>
                        <div className="space-y-4">
                            <div>
                                <Subheading>Weekly meal prep list</Subheading>
                                <Text>
                                    This is your main list for planned recipes. You add recipes to it throughout the week, and it includes all ingredients you need for those meals. After shopping, you can delete it or start fresh for the next week.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Staples list</Subheading>
                                <Text>
                                    Keep a separate list for pantry staples you always need: olive oil, spices, canned goods, etc. This list stays active and you add to it as you notice things running low. It's separate from your weekly meal prep ingredients.
                                </Text>
                            </div>
                            <div>
                                <Subheading>Bulk shopping list</Subheading>
                                <Text>
                                    For items you buy in larger quantities (rice, beans, frozen vegetables), maintain a bulk list. You might shop this monthly or quarterly, separate from weekly meal prep.
                                </Text>
                            </div>
                        </div>
                        <Text>
                            Being able to manage multiple lists means you can keep meal prep ingredients separate from staples and bulk items. This makes shopping more organized and helps you plan different shopping trips efficiently.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>Substitutions and portion scaling (practical tips)</Heading>
                        <Text>
                            When using a <Strong>grocery list from recipes app</Strong>, you'll sometimes need to adjust recipes:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                - <Strong>Ingredient substitutions:</Strong> If a recipe calls for an ingredient you don't like or can't find, you can modify the recipe and then add it to your grocery list again, or manually edit items in your grocery list.
                            </Text>
                            <Text>
                                - <Strong>Omitting ingredients:</Strong> If you're skipping an ingredient (maybe you already have it, or you don't need it), remove it from the recipe or manually remove it from the grocery list.
                            </Text>
                            <Text>
                                - <Strong>Adding extras:</Strong> You can always add items to your grocery list manually, maybe you want extra vegetables or a specific brand of something.
                            </Text>
                        </div>
                        <Text>
                            The key is that the app handles everything for you. If you substitute one ingredient for another, the list updates. You focus on planning, and the app handles the calculations.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Heading level={2}>From shopping to logging meals</Heading>
                        <Text>
                            A <Strong>grocery list from recipes app</Strong> creates a complete workflow:
                        </Text>
                        <div className="ml-4 space-y-2">
                            <Text>
                                <Strong>1. Plan meals:</Strong> Select recipes you want to make
                            </Text>
                            <Text>
                                <Strong>2. Add to grocery list:</Strong> Add recipes to your grocery list, and ingredients are added automatically
                            </Text>
                            <Text>
                                <Strong>3. Shop:</Strong> Use the list at the store, check off items as you go
                            </Text>
                            <Text>
                                <Strong>4. Cook:</Strong> Follow the recipes you've saved
                            </Text>
                            <Text>
                                <Strong>5. Log meals:</Strong> When you eat, log the recipe and serving size. Macros are calculated automatically because the recipe is already in your database.
                            </Text>
                        </div>
                        <Text>
                            This creates a seamless flow: recipes feed into grocery lists, grocery lists guide shopping, shopping enables cooking, and cooked meals are logged quickly because recipes are already saved. No re-entering ingredients, no manual calculations, no friction between planning and tracking.
                        </Text>
                        <Text>
                            The result is a meal prep system that works from start to finish. You plan once, shop efficiently, cook confidently, and track accurately, all without switching between different apps or doing manual work.
                        </Text>
                    </div>
                    <div className="mt-10 space-y-4">
                        <Text>
                            Ready to streamline your meal prep? NoBullFit connects recipes, grocery lists, and meal logging in one workflow. Add recipes to shopping lists, and log nutrition effortlessly.
                        </Text>
                        <div className="mt-6 flex justify-center">
                            <Button href="/sign-up">
                                Create a grocery list
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GroceryListFromRecipesApp;
