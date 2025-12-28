import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from "@components/dropdown";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { ChevronDown } from "lucide-react";

// Get default category based on current time
function getDefaultCategory(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Breakfast";
    if (hour >= 11 && hour < 15) return "Lunch";
    if (hour >= 15 && hour < 20) return "Dinner";
    return "Snack";
}

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"];

interface EdamamFood {
    foodId: string;
    label: string;
    knownAs?: string;
    nutrients: {
        ENERC_KCAL?: number;
        PROCNT?: number;
        FAT?: number;
        CHOCDF?: number;
        FIBTG?: number;
        NA?: number;
        CA?: number;
        FE?: number;
        K?: number;
        MG?: number;
        P?: number;
        ZN?: number;
        VITC?: number;
        THIA?: number;
        RIBF?: number;
        NIA?: number;
        VITB6A?: number;
        FOLDFE?: number;
        VITB12?: number;
        VITD?: number;
        VITK1?: number;
        TOCPHA?: number;
        VITA_RAE?: number;
        CHOLE?: number;
        FASAT?: number;
        FAMS?: number;
        FAPU?: number;
        SUGAR?: number;
        WATER?: number;
    };
    brand?: string;
    category?: string;
    categoryLabel?: string;
    foodContentsLabel?: string;
    image?: string;
    measures?: Array<{
        uri: string;
        label: string;
        weight: number;
    }>;
}

interface FoodDetailsData {
    food: EdamamFood;
}

interface GroceryList {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    items: unknown[];
}

const FoodDetails: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[]; foodData?: FoodDetailsData; error?: string };
    const navigate = useNavigate();
    const helmet = useHelmet();
    const { foodId } = useParams<{ foodId: string }>();
    const [isFavorite, setIsFavorite] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    const [isAddToListDialogOpen, setIsAddToListDialogOpen] = useState(false);
    const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string>("");
    const [newListName, setNewListName] = useState("");
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [isAddingToList, setIsAddingToList] = useState(false);
    const [isLoadingLists, setIsLoadingLists] = useState(false);
    
    // Log food dialog state
    const [isLogFoodDialogOpen, setIsLogFoodDialogOpen] = useState(false);
    const [logQuantity, setLogQuantity] = useState("1");
    const [logMeasureUri, setLogMeasureUri] = useState("");
    const [logMeasureLabel, setLogMeasureLabel] = useState("");
    const [logCategory, setLogCategory] = useState(getDefaultCategory());
    const [isLoggingFood, setIsLoggingFood] = useState(false);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const foodData = loaderData.foodData || null;
    const error = loaderData.error || null;

    // Check if food is favorited on mount
    useEffect(() => {
        if (foodId) {
            fetch(`/api/favorites/check/${encodeURIComponent(foodId)}`, {
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
    }, [foodId]);

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

    // Reset measure selection when log food dialog opens
    useEffect(() => {
        if (isLogFoodDialogOpen && foodData?.food?.measures && Array.isArray(foodData.food.measures) && foodData.food.measures.length > 0) {
            // Auto-select first measure when dialog opens
            const firstMeasure = foodData.food.measures[0];
            setLogMeasureUri(firstMeasure.uri);
            setLogMeasureLabel(firstMeasure.label);
            setLogQuantity("1");
        } else if (isLogFoodDialogOpen) {
            // Reset if no measures available
            setLogMeasureUri("");
            setLogMeasureLabel("");
            setLogQuantity("1");
        }
    }, [isLogFoodDialogOpen, foodData]);

    const handleBack = () => {
        navigate("/dashboard/food-database");
    };

    const handleToggleFavorite = async () => {
        if (!foodId || !foodData) return;

        setIsToggling(true);
        try {
            if (isFavorite) {
                // Remove from favorites
                const response = await fetch(`/api/favorites/${encodeURIComponent(foodId)}`, {
                    method: "DELETE",
                    credentials: "include"
                });
                if (response.ok) {
                    setIsFavorite(false);
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
                        foodId: foodId,
                        foodLabel: foodData.food.label,
                        foodData: foodData.food,
                        itemType: "food"
                    })
                });
                if (response.ok) {
                    setIsFavorite(true);
                }
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
        } finally {
            setIsToggling(false);
        }
    };

    const handleCreateListAndAdd = async () => {
        if (!newListName.trim() || !foodId || !foodData) return;

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

                // Add item to the new list
                await handleAddToList(newListId);
            }
        } catch (error) {
            console.error("Error creating list and adding item:", error);
        } finally {
            setIsCreatingList(false);
        }
    };

    const handleAddToList = async (listId?: number) => {
        const targetListId = listId || parseInt(selectedListId);
        if (!targetListId || !foodId || !foodData) return;

        setIsAddingToList(true);
        try {
            const response = await fetch(`/api/grocery-lists/${targetListId}/items`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    items: [
                        {
                            foodId: foodId,
                            foodLabel: foodData.food.label,
                            foodData: foodData.food,
                            quantity: 1
                        }
                    ]
                })
            });

            if (response.ok) {
                setIsAddToListDialogOpen(false);
                setSelectedListId("");
                setNewListName("");
            }
        } catch (error) {
            console.error("Error adding to list:", error);
        } finally {
            setIsAddingToList(false);
        }
    };

    const handleLogFood = async () => {
        if (!foodId || !foodData || !logQuantity) return;

        // If no measure URI is selected but we have measures, use the first one
        let measureUri = logMeasureUri;
        let measureLabel = logMeasureLabel;
        
        if (!measureUri && foodData.food.measures && foodData.food.measures.length > 0) {
            measureUri = foodData.food.measures[0].uri;
            measureLabel = foodData.food.measures[0].label;
        } else if (!measureUri) {
            // Default to grams if no measure is available
            measureUri = "http://www.edamam.com/ontologies/edamam.owl#Measure_gram";
            measureLabel = measureLabel || "g";
        }

        setIsLoggingFood(true);
        try {
            // Get current date in user's timezone
            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Log the food (nutrients will be calculated server-side)
            const logResponse = await fetch("/api/food-tracking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    itemType: "food",
                    foodId: foodId,
                    foodLabel: foodData.food.label,
                    foodData: foodData.food,
                    quantity: parseFloat(logQuantity),
                    measureUri: measureUri,
                    measureLabel: measureLabel,
                    category: logCategory,
                    date: dateStr,
                    timezone: timezone
                })
            });

            if (logResponse.ok) {
                setIsLogFoodDialogOpen(false);
                setLogQuantity("1");
                setLogMeasureUri("");
                setLogMeasureLabel("");
                setLogCategory(getDefaultCategory());
            } else {
                const errorData = await logResponse.json();
                throw new Error(errorData.error || "Failed to log food");
            }
        } catch (error) {
            console.error("Error logging food:", error);
            alert(error instanceof Error ? error.message : "Failed to log food. Please try again.");
        } finally {
            setIsLoggingFood(false);
        }
    };

    if (error || !foodData) {
        return (
            <SidebarLayout
                navbar={
                    <Navbar>
                        <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                        <NavbarSpacer />
                        <NavbarSection>
                            <UserDropdown />
                        </NavbarSection>
                    </Navbar>
                }
                sidebar={<DashboardSidebar currentPath="/dashboard/food-database" />}
            >
                <div className="space-y-8">
                    <div>
                        <Heading level={1}>Food Details</Heading>
                        <Text className="mt-2 text-red-600 dark:text-red-400">
                            {error || "Food not found"}
                        </Text>
                    </div>
                    <Button onClick={handleBack}>Back to Search</Button>
                </div>
            </SidebarLayout>
        );
    }

    const { food } = foodData;
    const nutrients = food.nutrients || {};

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/food-database" />}
        >
            <div className="space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Heading level={1}>{food.label}</Heading>
                        {food.knownAs && (
                            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                                Also known as: {food.knownAs}
                            </Text>
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
                                <DropdownItem 
                                    onClick={() => {
                                        // Initialize with first measure if available
                                        if (food.measures && food.measures.length > 0) {
                                            setLogMeasureUri(food.measures[0].uri);
                                            setLogMeasureLabel(food.measures[0].label);
                                        }
                                        setIsLogFoodDialogOpen(true);
                                    }}
                                >
                                    Log Food
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Basic Information */}
                    <section>
                        <Heading level={2}>Basic Information</Heading>
                        <DescriptionList>
                            {food.brand && (
                                <>
                                    <DescriptionTerm>Brand</DescriptionTerm>
                                    <DescriptionDetails>{food.brand}</DescriptionDetails>
                                </>
                            )}
                            {(food.categoryLabel || food.category) && (
                                <>
                                    <DescriptionTerm>Category</DescriptionTerm>
                                    <DescriptionDetails>
                                        {food.categoryLabel || food.category}
                                    </DescriptionDetails>
                                </>
                            )}
                            {food.foodContentsLabel && (
                                <>
                                    <DescriptionTerm>Contents</DescriptionTerm>
                                    <DescriptionDetails>{food.foodContentsLabel}</DescriptionDetails>
                                </>
                            )}
                        </DescriptionList>
                    </section>

                    {/* Nutritional Information (per 100g) */}
                    <section>
                        <Heading level={2}>Nutritional Information (per 100g)</Heading>
                        <DescriptionList>
                            {nutrients.ENERC_KCAL !== undefined && (
                                <>
                                    <DescriptionTerm>Calories</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.ENERC_KCAL.toFixed(0)} kcal</DescriptionDetails>
                                </>
                            )}
                            {nutrients.PROCNT !== undefined && (
                                <>
                                    <DescriptionTerm>Protein</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.PROCNT.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.CHOCDF !== undefined && (
                                <>
                                    <DescriptionTerm>Carbohydrates</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.CHOCDF.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.FAT !== undefined && (
                                <>
                                    <DescriptionTerm>Fat</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.FAT.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.FIBTG !== undefined && (
                                <>
                                    <DescriptionTerm>Fiber</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.FIBTG.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.SUGAR !== undefined && (
                                <>
                                    <DescriptionTerm>Sugar</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.SUGAR.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.NA !== undefined && (
                                <>
                                    <DescriptionTerm>Sodium</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.NA.toFixed(0)} mg</DescriptionDetails>
                                </>
                            )}
                            {nutrients.CHOLE !== undefined && (
                                <>
                                    <DescriptionTerm>Cholesterol</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.CHOLE.toFixed(0)} mg</DescriptionDetails>
                                </>
                            )}
                            {nutrients.FASAT !== undefined && (
                                <>
                                    <DescriptionTerm>Saturated Fat</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.FASAT.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.FAMS !== undefined && (
                                <>
                                    <DescriptionTerm>Monounsaturated Fat</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.FAMS.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                            {nutrients.FAPU !== undefined && (
                                <>
                                    <DescriptionTerm>Polyunsaturated Fat</DescriptionTerm>
                                    <DescriptionDetails>{nutrients.FAPU.toFixed(1)} g</DescriptionDetails>
                                </>
                            )}
                        </DescriptionList>
                    </section>

                    {/* Vitamins and Minerals */}
                    {(nutrients.CA !== undefined || nutrients.FE !== undefined || nutrients.K !== undefined || 
                      nutrients.MG !== undefined || nutrients.P !== undefined || nutrients.ZN !== undefined ||
                      nutrients.VITC !== undefined || nutrients.VITD !== undefined || nutrients.VITK1 !== undefined ||
                      nutrients.TOCPHA !== undefined || nutrients.VITA_RAE !== undefined) && (
                        <section>
                            <Heading level={2}>Vitamins & Minerals (per 100g)</Heading>
                            <DescriptionList>
                                {nutrients.CA !== undefined && (
                                    <>
                                        <DescriptionTerm>Calcium</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.CA.toFixed(0)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.FE !== undefined && (
                                    <>
                                        <DescriptionTerm>Iron</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.FE.toFixed(1)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.K !== undefined && (
                                    <>
                                        <DescriptionTerm>Potassium</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.K.toFixed(0)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.MG !== undefined && (
                                    <>
                                        <DescriptionTerm>Magnesium</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.MG.toFixed(0)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.P !== undefined && (
                                    <>
                                        <DescriptionTerm>Phosphorus</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.P.toFixed(0)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.ZN !== undefined && (
                                    <>
                                        <DescriptionTerm>Zinc</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.ZN.toFixed(1)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.VITC !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin C</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.VITC.toFixed(1)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.VITD !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin D</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.VITD.toFixed(1)} µg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.VITK1 !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin K</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.VITK1.toFixed(1)} µg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.TOCPHA !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin E</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.TOCPHA.toFixed(1)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.VITA_RAE !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin A</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.VITA_RAE.toFixed(0)} µg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.THIA !== undefined && (
                                    <>
                                        <DescriptionTerm>Thiamin (B1)</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.THIA.toFixed(2)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.RIBF !== undefined && (
                                    <>
                                        <DescriptionTerm>Riboflavin (B2)</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.RIBF.toFixed(2)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.NIA !== undefined && (
                                    <>
                                        <DescriptionTerm>Niacin (B3)</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.NIA.toFixed(1)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.VITB6A !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin B6</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.VITB6A.toFixed(2)} mg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.FOLDFE !== undefined && (
                                    <>
                                        <DescriptionTerm>Folate (DFE)</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.FOLDFE.toFixed(0)} µg</DescriptionDetails>
                                    </>
                                )}
                                {nutrients.VITB12 !== undefined && (
                                    <>
                                        <DescriptionTerm>Vitamin B12</DescriptionTerm>
                                        <DescriptionDetails>{nutrients.VITB12.toFixed(1)} µg</DescriptionDetails>
                                    </>
                                )}
                            </DescriptionList>
                        </section>
                    )}

                    {/* Other Nutrients */}
                    {nutrients.WATER !== undefined && (
                        <section>
                            <Heading level={2}>Other</Heading>
                            <DescriptionList>
                                <DescriptionTerm>Water</DescriptionTerm>
                                <DescriptionDetails>{nutrients.WATER.toFixed(1)} g</DescriptionDetails>
                            </DescriptionList>
                        </section>
                    )}
                </div>
                
                {/* Edamam Attribution */}
                <div className="flex justify-end">
                    <a 
                        href="https://www.edamam.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Powered by Edamam"
                    >
                        <img 
                            src="https://developer.edamam.com/images/transparent.svg" 
                            alt="Powered by Edamam"
                            className="h-6"
                        />
                    </a>
                </div>
            </div>

            {/* Add to Grocery List Dialog */}
            <Dialog open={isAddToListDialogOpen} onClose={setIsAddToListDialogOpen} size="xl">
                <DialogTitle>Add to Grocery List</DialogTitle>
                <DialogDescription>
                    Select a grocery list to add this item to, or create a new list.
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
                                                handleCreateListAndAdd();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={handleCreateListAndAdd}
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
                        onClick={() => handleAddToList()}
                        disabled={isAddingToList || !selectedListId || isLoadingLists}
                    >
                        {isAddingToList ? "Adding..." : "Add to List"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Log Food Dialog */}
            <Dialog open={isLogFoodDialogOpen} onClose={setIsLogFoodDialogOpen} size="xl">
                <DialogTitle>Log Food</DialogTitle>
                <DialogDescription>
                    Log "{foodData?.food.label}" to your food tracking. Select the quantity and category.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-6">
                        {foodData?.food?.measures && Array.isArray(foodData.food.measures) && foodData.food.measures.length > 0 ? (
                            <>
                                <Field>
                                    <FieldLabel>Select Measure</FieldLabel>
                                    <Select
                                        value={logMeasureUri}
                                        onChange={(e) => {
                                            const selectedMeasure = foodData?.food.measures?.find(
                                                m => m.uri === e.target.value
                                            );
                                            if (selectedMeasure) {
                                                setLogMeasureUri(e.target.value);
                                                setLogMeasureLabel(selectedMeasure.label);
                                                // Set quantity to 1 for convenience
                                                setLogQuantity("1");
                                            }
                                        }}
                                        disabled={isLoggingFood}
                                    >
                                        <option value="">Select a measure...</option>
                                        {foodData.food.measures.map((measure) => (
                                            <option key={measure.uri} value={measure.uri}>
                                                {measure.label} ({measure.weight}g)
                                            </option>
                                        ))}
                                    </Select>
                                    <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Select a measure from the list above. For example, choose "whole" to log 1 whole banana.
                                    </Text>
                                </Field>
                                <Field>
                                    <FieldLabel>Quantity</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={logQuantity}
                                        onChange={(e) => setLogQuantity(e.target.value)}
                                        disabled={isLoggingFood || !logMeasureUri}
                                        placeholder={logMeasureLabel ? `Number of ${logMeasureLabel}` : "Enter quantity"}
                                    />
                                    {logMeasureLabel && (
                                        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            Enter how many {logMeasureLabel} you consumed.
                                        </Text>
                                    )}
                                </Field>
                            </>
                        ) : (
                            <>
                                <Field>
                                    <FieldLabel>Quantity</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={logQuantity}
                                        onChange={(e) => setLogQuantity(e.target.value)}
                                        disabled={isLoggingFood}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Measure</FieldLabel>
                                    <Input
                                        type="text"
                                        value={logMeasureLabel}
                                        onChange={(e) => setLogMeasureLabel(e.target.value)}
                                        placeholder="e.g., g, cup, piece"
                                        disabled={isLoggingFood}
                                    />
                                    <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Enter the unit of measurement. Default is grams (g).
                                    </Text>
                                </Field>
                            </>
                        )}
                        <Field>
                            <FieldLabel>Category</FieldLabel>
                            <Select
                                value={logCategory}
                                onChange={(e) => setLogCategory(e.target.value)}
                                disabled={isLoggingFood}
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
                    <Button plain onClick={() => setIsLogFoodDialogOpen(false)} disabled={isLoggingFood}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLogFood}
                        disabled={isLoggingFood || !logQuantity}
                    >
                        {isLoggingFood ? "Logging..." : "Log Food"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Back Button */}
            <div className="mt-8">
                <Button onClick={handleBack} outline>
                    Back to Search
                </Button>
            </div>
        </SidebarLayout>
    );
};

export default FoodDetails;