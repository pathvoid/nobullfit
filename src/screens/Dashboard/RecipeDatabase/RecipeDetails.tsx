import React, { useState, useEffect } from "react";
import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@components/dialog";
import { Field, Label as FieldLabel } from "@components/fieldset";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@components/description-list";
import { Description } from "@components/fieldset";
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "@components/dropdown";
import { useAuth } from "@core/contexts/AuthContext";
import { RecipeMacros } from "@core/components/RecipeMacrosInput";
import { Ingredient, convertIngredient, UNITS, UnitSystem } from "@utils/ingredientUnits";
import { RecipeTagKey, RECIPE_TAGS } from "@utils/recipeTags";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

// Get default category based on current time
function getDefaultCategory(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Breakfast";
    if (hour >= 11 && hour < 15) return "Lunch";
    if (hour >= 15 && hour < 20) return "Dinner";
    return "Snack";
}

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"];

interface GroceryList {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    items: unknown[];
}

interface Recipe {
    id: number;
    name: string;
    description: string | null;
    ingredients: (string | Ingredient)[];
    steps: string[];
    image_filename: string | null;
    macros?: RecipeMacros | null;
    servings?: number | null;
    cooking_time_minutes?: number | null;
    tags?: RecipeTagKey[];
    is_public: boolean;
    is_verified?: boolean;
    author_name: string;
    created_at: string;
    updated_at: string;
    user_id: number;
}

const RecipeDetails: React.FC = () => {
    const loaderData = useLoaderData() as { recipe: Recipe; title: string; meta: unknown[] };
    const helmet = useHelmet();
    const navigate = useNavigate();
    const { recipeId } = useParams<{ recipeId: string }>();
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [unitSystem, setUnitSystem] = useState<UnitSystem>("hybrid");
    
    // Grocery list dialog state
    const [isAddToListDialogOpen, setIsAddToListDialogOpen] = useState(false);
    const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>("");
    const [newListName, setNewListName] = useState("");
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const [isLoadingLists, setIsLoadingLists] = useState(false);
    
    // Log recipe dialog state
    const [isLogRecipeDialogOpen, setIsLogRecipeDialogOpen] = useState(false);
    const [logServings, setLogServings] = useState("1");
    const [logCategory, setLogCategory] = useState(getDefaultCategory());
    const [isLoggingRecipe, setIsLoggingRecipe] = useState(false);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const { recipe } = loaderData;
    const isOwnRecipe = user && recipe.user_id === user.id;

    // Check if recipe is favorited on mount
    useEffect(() => {
        if (recipeId) {
            fetch(`/api/favorites/check/${encodeURIComponent(recipeId)}?itemType=recipe`, {
                credentials: "include"
            })
                .then(res => res.json())
                .then(data => {
                    setIsFavorite(data.isFavorite || false);
                })
                .catch(() => {
                    // Silently fail - user might not be logged in
                });
        }
    }, [recipeId]);

    // Load grocery lists when dialog opens
    useEffect(() => {
        if (isAddToListDialogOpen) {
            setIsLoadingLists(true);
            fetch("/api/grocery-lists", {
                credentials: "include"
            })
                .then(res => res.json())
                .then(data => {
                    setGroceryLists(data.lists || []);
                    setIsLoadingLists(false);
                })
                .catch(() => {
                    setIsLoadingLists(false);
                });
        }
    }, [isAddToListDialogOpen]);

    const handleBack = () => {
        navigate("/dashboard/recipe-database");
    };

    const handleEdit = () => {
        navigate(`/dashboard/recipe-database/${recipeId}/edit`, {
            state: { recipe }
        });
    };

    const handleDuplicate = () => {
        navigate("/dashboard/recipe-database/create", {
            state: { duplicateRecipe: recipe }
        });
    };

    const handleToggleFavorite = async () => {
        if (!recipeId) return;

        setIsToggling(true);
        try {
            if (isFavorite) {
                // Remove from favorites
                const response = await fetch(`/api/favorites/${encodeURIComponent(recipeId)}?itemType=recipe`, {
                    method: "DELETE",
                    credentials: "include"
                });
                if (response.ok) {
                    setIsFavorite(false);
                    toast.success("Removed from favorites");
                }
            } else {
                // Add to favorites
                const response = await fetch("/api/favorites", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        foodId: recipeId,
                        foodLabel: recipe.name,
                        foodData: recipe,
                        itemType: "recipe"
                    })
                });
                if (response.ok) {
                    setIsFavorite(true);
                    toast.success("Added to favorites!");
                }
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            toast.error("Failed to update favorites. Please try again.");
        } finally {
            setIsToggling(false);
        }
    };

    const handleAddRecipeToGroceryList = async (listId?: number) => {
        const targetListId = listId || parseInt(selectedListId);
        if (!targetListId || !recipeId) return;

        setIsAddingToList(true);
        try {
            const response = await fetch(`/api/grocery-lists/${targetListId}/add-recipe`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    recipeId: recipeId,
                    servings: recipe.servings || 1
                })
            });

            if (response.ok) {
                setIsAddToListDialogOpen(false);
                setSelectedListId("");
                setNewListName("");
                toast.success("Ingredients added to grocery list!");
            }
        } catch (error) {
            console.error("Error adding recipe to list:", error);
            toast.error("Failed to add ingredients to grocery list. Please try again.");
        } finally {
            setIsAddingToList(false);
        }
    };

    const handleCreateListAndAddRecipe = async () => {
        if (!newListName.trim() || !recipeId) return;

        setIsCreatingList(true);
        try {
            // Create new list
            const createResponse = await fetch("/api/grocery-lists", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ name: newListName.trim() })
            });

            if (createResponse.ok) {
                const createData = await createResponse.json();
                const newListId = createData.list.id;

                // Add recipe ingredients to the new list
                await handleAddRecipeToGroceryList(newListId);
            }
        } catch (error) {
            console.error("Error creating list and adding recipe:", error);
        } finally {
            setIsCreatingList(false);
        }
    };

    const handleLogRecipe = async () => {
        if (!recipeId || !logServings) return;

        setIsLoggingRecipe(true);
        try {
            // Get current date in user's local timezone (not UTC)
            const now = new Date();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Use Intl.DateTimeFormat with en-CA locale to get YYYY-MM-DD format in local timezone
            const dateStr = new Intl.DateTimeFormat("en-CA", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                timeZone: timezone
            }).format(now);

            // Calculate nutrients based on servings
            // Note: recipe.macros are already per serving, so we multiply by the number of servings logged
            const servings = parseFloat(logServings);

            const nutrients: Record<string, number> = {};
            if (recipe.macros) {
                const macros = recipe.macros;
                Object.keys(macros).forEach((key) => {
                    const value = macros[key as keyof typeof macros];
                    if (value !== undefined && value !== null) {
                        // Map recipe macro keys to nutrient codes
                        const nutrientKey = key === "calories" ? "ENERC_KCAL" :
                                          key === "protein" ? "PROCNT" :
                                          key === "carbohydrates" ? "CHOCDF" :
                                          key === "fat" ? "FAT" :
                                          key === "fiber" ? "FIBTG" :
                                          key === "sugars" ? "SUGAR" :
                                          key === "sodium" ? "NA" :
                                          key === "potassium" ? "K" :
                                          key === "cholesterol" ? "CHOLE" :
                                          key === "saturated_fat" ? "FASAT" :
                                          key === "monounsaturated_fat" ? "FAMS" :
                                          key === "polyunsaturated_fat" ? "FAPU" : key.toUpperCase();
                        // Multiply by servings since macros are per serving
                        nutrients[nutrientKey] = value * servings;
                    }
                });
            }

            // Log the recipe
            const logResponse = await fetch("/api/food-tracking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    itemType: "recipe",
                    foodId: recipeId,
                    foodLabel: recipe.name,
                    foodData: {
                        id: recipe.id,
                        name: recipe.name,
                        label: recipe.name
                    },
                    recipeData: recipe,
                    quantity: servings,
                    measureLabel: recipe.servings ? `serving${servings !== 1 ? "s" : ""}` : "portion",
                    category: logCategory,
                    date: dateStr,
                    timezone: timezone,
                    nutrients: nutrients
                })
            });

            if (logResponse.ok) {
                setIsLogRecipeDialogOpen(false);
                setLogServings("1");
                setLogCategory(getDefaultCategory());
                toast.success("Recipe logged successfully!");
            } else {
                const errorData = await logResponse.json();
                throw new Error(errorData.error || "Failed to log recipe");
            }
        } catch (error) {
            console.error("Error logging recipe:", error);
            toast.error(error instanceof Error ? error.message : "Failed to log recipe. Please try again.");
        } finally {
            setIsLoggingRecipe(false);
        }
    };

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/recipe-database" />}
        >
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Heading level={1}>{recipe.name}</Heading>
                            {recipe.is_verified && (
                                <span className="text-green-600 dark:text-green-400 text-xl" title="Verified recipe">
                                    ✓
                                </span>
                            )}
                        </div>
                        {recipe.description && (
                            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                                {recipe.description}
                            </Text>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                            <span>By {recipe.author_name}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{recipe.is_public ? "Public" : "Private"}</span>
                            {recipe.is_verified && (
                                <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="text-green-600 dark:text-green-400">Verified</span>
                                </>
                            )}
                            {recipe.servings !== undefined && recipe.servings !== null && (
                                <>
                                    <span className="hidden sm:inline">•</span>
                                    <span>{recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}</span>
                                </>
                            )}
                            {recipe.cooking_time_minutes !== undefined && recipe.cooking_time_minutes !== null && (
                                <>
                                    <span className="hidden sm:inline">•</span>
                                    <span>{recipe.cooking_time_minutes} min</span>
                                </>
                            )}
                        </div>
                        {recipe.tags && recipe.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {recipe.tags.map((tagKey) => (
                                    <span
                                        key={tagKey}
                                        className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30"
                                    >
                                        {RECIPE_TAGS[tagKey] || tagKey}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        {isFavorite ? (
                            <Button 
                                onClick={handleToggleFavorite}
                                disabled={isToggling}
                                color="red"
                                className="w-full sm:w-auto"
                            >
                                ★ Remove from Favorites
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleToggleFavorite}
                                disabled={isToggling}
                                outline
                                className="w-full sm:w-auto"
                            >
                                ☆ Add to Favorites
                            </Button>
                        )}
                        <Dropdown>
                            <DropdownButton outline className="w-full sm:w-auto">
                                More Actions
                                <ChevronDown className="size-4" />
                            </DropdownButton>
                            <DropdownMenu>
                                <DropdownItem onClick={() => setIsAddToListDialogOpen(true)}>
                                    Add to Grocery List
                                </DropdownItem>
                                {isOwnRecipe ? (
                                    <DropdownItem onClick={handleEdit}>
                                        Edit Recipe
                                    </DropdownItem>
                                ) : (
                                    <DropdownItem onClick={handleDuplicate}>
                                        Duplicate Recipe
                                    </DropdownItem>
                                )}
                                <DropdownItem onClick={() => setIsLogRecipeDialogOpen(true)}>
                                    Log Recipe
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </div>

                {/* Image and Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Image (if exists) */}
                    {recipe.image_filename && (
                        <div className="lg:col-span-1">
                            <img 
                                src={`https://cdn.nobull.fit/recipes/${recipe.image_filename}`}
                                alt={recipe.name}
                                className="w-full max-w-md mx-auto lg:max-w-full h-auto rounded-lg border border-zinc-950/10 dark:border-white/10 object-cover"
                            />
                        </div>
                    )}

                    {/* Right Column - Ingredients and Nutritional Info */}
                    <div className={`space-y-6 ${recipe.image_filename ? "lg:col-span-2" : "lg:col-span-3"}`}>
                        {/* Ingredients and Nutritional Info Side by Side on Desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Ingredients */}
                            {recipe.ingredients.length > 0 && (
                                <section>
                                    <div className="flex flex-col gap-3 mb-4">
                                        <Heading level={2} className="text-lg">Ingredients</Heading>
                                        {recipe.ingredients.some(ing => 
                                            typeof ing !== "string" && ing.quantity !== null && ing.unit
                                        ) && (
                                            <div className="inline-flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                                                <button
                                                    onClick={() => setUnitSystem("hybrid")}
                                                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                                        unitSystem === "hybrid"
                                                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                                                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                                    }`}
                                                >
                                                    Original
                                                </button>
                                                <button
                                                    onClick={() => setUnitSystem("metric")}
                                                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                                        unitSystem === "metric"
                                                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                                                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                                    }`}
                                                >
                                                    Metric
                                                </button>
                                                <button
                                                    onClick={() => setUnitSystem("imperial")}
                                                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                                        unitSystem === "imperial"
                                                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                                                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                                                    }`}
                                                >
                                                    Imperial
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <ul className="space-y-2">
                                        {recipe.ingredients.map((ingredient, index) => {
                                            let displayIngredient: Ingredient;
                                            if (typeof ingredient === "string") {
                                                displayIngredient = { quantity: null, unit: "", name: ingredient };
                                            } else {
                                                displayIngredient = ingredient;
                                            }
                                            
                                            // Only convert if we have both quantity and a unit
                                            if (displayIngredient.quantity !== null && displayIngredient.unit) {
                                                displayIngredient = convertIngredient(displayIngredient, unitSystem);
                                            }
                                            
                                            // Build quantity display - only show unit label if unit exists
                                            let quantityDisplay = "";
                                            if (displayIngredient.quantity !== null) {
                                                const unitLabel = displayIngredient.unit 
                                                    ? (UNITS[displayIngredient.unit as keyof typeof UNITS]?.label || displayIngredient.unit)
                                                    : "";
                                                quantityDisplay = unitLabel 
                                                    ? `${displayIngredient.quantity} ${unitLabel}`
                                                    : `${displayIngredient.quantity}`;
                                            }
                                            const fullDisplay = quantityDisplay 
                                                ? `${quantityDisplay} ${displayIngredient.name}`
                                                : displayIngredient.name;
                                            
                                            return (
                                                <li key={index} className="text-zinc-700 dark:text-zinc-300">
                                                    {fullDisplay}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            )}

                            {/* Nutritional Information */}
                            {recipe.macros && typeof recipe.macros === "object" && Object.keys(recipe.macros).length > 0 && (
                                <section>
                                    <Heading level={2} className="text-lg mb-3">
                                        Nutritional Information
                                        {recipe.servings && recipe.servings > 0 && (
                                            <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400"> (per portion)</span>
                                        )}
                                    </Heading>
                                    <div className="space-y-2">
                                        {recipe.macros.calories !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Calories</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.calories.toFixed(0)} kcal</span>
                                            </div>
                                        )}
                                        {recipe.macros.protein !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Protein</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.protein.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.carbohydrates !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Carbohydrates</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.carbohydrates.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.fat !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Fat</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.fat.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.fiber !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Fiber</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.fiber.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.sugars !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Sugars</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.sugars.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.net_carbs !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Net Carbs</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.net_carbs.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.saturated_fat !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Saturated Fat</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.saturated_fat.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.unsaturated_fat !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Unsaturated Fat</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.unsaturated_fat.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.polyunsaturated_fat !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Polyunsaturated Fat</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.polyunsaturated_fat.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.monounsaturated_fat !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Monounsaturated Fat</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.monounsaturated_fat.toFixed(1)} g</span>
                                            </div>
                                        )}
                                        {recipe.macros.cholesterol !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Cholesterol</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.cholesterol.toFixed(0)} mg</span>
                                            </div>
                                        )}
                                        {recipe.macros.sodium !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Sodium</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.sodium.toFixed(0)} mg</span>
                                            </div>
                                        )}
                                        {recipe.macros.potassium !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Potassium</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.potassium.toFixed(0)} mg</span>
                                            </div>
                                        )}
                                        {recipe.macros.protein_distribution_per_meal !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-zinc-600 dark:text-zinc-400">Protein Distribution per Meal</span>
                                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{recipe.macros.protein_distribution_per_meal.toFixed(1)} g</span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>
                </div>

                {/* Instructions - Full Width */}
                {recipe.steps.length > 0 && (
                    <section>
                        <Heading level={2} className="text-lg mb-4">Instructions</Heading>
                        <DescriptionList>
                            {recipe.steps.map((step, index) => (
                                <React.Fragment key={index}>
                                    <DescriptionTerm>Step {index + 1}</DescriptionTerm>
                                    <DescriptionDetails>{step}</DescriptionDetails>
                                </React.Fragment>
                            ))}
                        </DescriptionList>
                    </section>
                )}
            </div>

            {/* Add Recipe Ingredients to Grocery List Dialog */}
            <Dialog open={isAddToListDialogOpen} onClose={setIsAddToListDialogOpen} size="xl">
                <DialogTitle>Add Ingredients to Grocery List</DialogTitle>
                <DialogDescription>
                    Add all ingredients from "{recipe.name}" to a grocery list. If an ingredient already exists, the quantities will be combined automatically.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-6">
                        {groceryLists.length > 0 && (
                            <Field>
                                <FieldLabel>Select List</FieldLabel>
                                <Select
                                    value={selectedListId}
                                    onChange={(e) => setSelectedListId(e.target.value)}
                                    disabled={isLoadingLists || isAddingToList}
                                >
                                    <option value="">Choose a list...</option>
                                    {groceryLists.map((list) => (
                                        <option key={list.id} value={list.id.toString()}>
                                            {list.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        )}

                        <div className="border-t border-zinc-950/10 pt-6 dark:border-white/10">
                            <Field>
                                <FieldLabel>Or Create New List</FieldLabel>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <Input
                                        type="text"
                                        value={newListName}
                                        onChange={(e) => setNewListName(e.target.value)}
                                        placeholder="New list name"
                                        disabled={isCreatingList || isAddingToList}
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && newListName.trim()) {
                                                handleCreateListAndAddRecipe();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={handleCreateListAndAddRecipe}
                                        disabled={isCreatingList || isAddingToList || !newListName.trim()}
                                        className="sm:w-auto w-full"
                                    >
                                        {isCreatingList ? "Creating..." : "Create & Add"}
                                    </Button>
                                </div>
                            </Field>
                        </div>
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setIsAddToListDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleAddRecipeToGroceryList()}
                        disabled={isAddingToList || !selectedListId || isLoadingLists}
                    >
                        {isAddingToList ? "Adding..." : "Add Ingredients"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Log Recipe Dialog */}
            <Dialog open={isLogRecipeDialogOpen} onClose={setIsLogRecipeDialogOpen} size="xl">
                <DialogTitle>Log Recipe</DialogTitle>
                <DialogDescription>
                    Log "{recipe.name}" to your food tracking. Select the number of servings and category.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-6">
                        <Field>
                            <FieldLabel>Servings</FieldLabel>
                            <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={logServings}
                                onChange={(e) => setLogServings(e.target.value)}
                                disabled={isLoggingRecipe}
                            />
                            {recipe.servings && (
                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Recipe makes {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
                                </Text>
                            )}
                        </Field>
                        <Field>
                            <FieldLabel>Category</FieldLabel>
                            <Select
                                value={logCategory}
                                onChange={(e) => setLogCategory(e.target.value)}
                                disabled={isLoggingRecipe}
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setIsLogRecipeDialogOpen(false)} disabled={isLoggingRecipe}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLogRecipe}
                        disabled={isLoggingRecipe || !logServings}
                    >
                        {isLoggingRecipe ? "Logging..." : "Log Recipe"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Back Button */}
            <div className="mt-8">
                <Button onClick={handleBack} outline>
                    Back
                </Button>
            </div>
        </SidebarLayout>
    );
};

export default RecipeDetails;
