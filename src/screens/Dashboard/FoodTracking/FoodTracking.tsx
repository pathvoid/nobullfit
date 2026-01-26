import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@components/dialog";
import { Field, Label as FieldLabel, Description } from "@components/fieldset";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel } from "@components/dropdown";
import { MobileBottomMenu, MobileBottomMenuSpacer, type MobileBottomMenuItem } from "@components/mobile-bottom-menu";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Copy, ClipboardPaste, Calendar, GripVertical, Crown, ChevronDown, MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface LoggedFood {
    id: number;
    item_type: string;
    food_id: string;
    food_label: string;
    food_data: unknown;
    recipe_data?: unknown;
    quantity: number;
    measure_uri?: string;
    measure_label?: string;
    category: string;
    date: string;
    timezone: string;
    nutrients: Record<string, number>;
    created_at: string;
    updated_at: string;
}

interface User {
    id: number;
    email: string;
    full_name: string;
    subscribed: boolean;
}

const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Other"];

// Get default category based on current time
function getDefaultCategory(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return "Breakfast";
    if (hour >= 11 && hour < 15) return "Lunch";
    if (hour >= 15 && hour < 20) return "Dinner";
    return "Snack";
}

// Format date for display
function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// Format quantity for display (removes unnecessary trailing zeros)
function formatQuantity(quantity: number): string {
    // Round to 2 decimal places max, then remove trailing zeros
    const rounded = Math.round(quantity * 100) / 100;
    return rounded.toString();
}

// Format date for API (YYYY-MM-DD)
function formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

const FoodTracking: React.FC = () => {
    const loaderData = useLoaderData() as {
        title: string;
        meta: unknown[];
        user?: User;
        initialFoods?: LoggedFood[];
        initialDate?: string | null;
        initialTimezone?: string | null;
    };
    const helmet = useHelmet();
    const navigate = useNavigate();

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Check if user is a Pro subscriber
    const isProUser = loaderData.user?.subscribed === true;

    // Initialize date state
    const [currentDate, setCurrentDate] = useState<Date>(() => {
        if (loaderData.initialDate) {
            return new Date(loaderData.initialDate + "T00:00:00");
        }
        return new Date();
    });

    const [foods, setFoods] = useState<LoggedFood[]>(loaderData.initialFoods || []);
    const [isLoading, setIsLoading] = useState(false);
    const [editingFood, setEditingFood] = useState<LoggedFood | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editQuantity, setEditQuantity] = useState("");
    const [editMeasureUri, setEditMeasureUri] = useState("");
    const [editMeasureLabel, setEditMeasureLabel] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [foodToDelete, setFoodToDelete] = useState<LoggedFood | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // Add food dialog state
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [recentFoods, setRecentFoods] = useState<LoggedFood[]>([]);
    const [selectedQuickAddFood, setSelectedQuickAddFood] = useState<LoggedFood | null>(null);
    const [addFoodName, setAddFoodName] = useState("");
    const [addQuantity, setAddQuantity] = useState("");
    const [addMeasureUri, setAddMeasureUri] = useState("");
    const [addMeasureLabel, setAddMeasureLabel] = useState("");
    const [addCategory, setAddCategory] = useState(getDefaultCategory());
    const [addItemType, setAddItemType] = useState<"food" | "recipe">("food");
    const [addFoodData, setAddFoodData] = useState<unknown>(null);
    const [addRecipeData, setAddRecipeData] = useState<unknown>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Manual entry macronutrients (optional)
    const [addManualKcal, setAddManualKcal] = useState("");
    const [addManualProtein, setAddManualProtein] = useState("");
    const [addManualCarbs, setAddManualCarbs] = useState("");
    const [addManualFat, setAddManualFat] = useState("");
    
    // Copy day state (Pro feature)
    const [copiedDate, setCopiedDate] = useState<string | null>(null);
    const [isPasting, setIsPasting] = useState(false);
    
    // Copy week dialog state (Pro feature)
    const [isCopyWeekDialogOpen, setIsCopyWeekDialogOpen] = useState(false);
    const [copyWeekSourceStart, setCopyWeekSourceStart] = useState("");
    const [copyWeekTargetStart, setCopyWeekTargetStart] = useState("");
    const [isCopyingWeek, setIsCopyingWeek] = useState(false);
    
    // Drag-and-drop state (Pro feature)
    const [draggedFood, setDraggedFood] = useState<LoggedFood | null>(null);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Fetch foods for the current date
    const fetchFoods = useCallback(async (date: Date) => {
        setIsLoading(true);
        try {
            const dateStr = formatDateForAPI(date);
            const response = await fetch(`/api/food-tracking?date=${dateStr}&timezone=${encodeURIComponent(userTimezone)}`, {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setFoods(data.foods || []);
            }
        } catch (error) {
            console.error("Error fetching foods:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userTimezone]);

    // Fetch recent foods for quick-add
    const fetchRecentFoods = useCallback(async () => {
        try {
            const response = await fetch("/api/food-tracking/recent", {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setRecentFoods(data.foods || []);
            }
        } catch (error) {
            console.error("Error fetching recent foods:", error);
        }
    }, []);
    
    // Check if a date is allowed for non-pro users (today or past only)
    const isDateAllowedForFreeUser = useCallback((date: Date): boolean => {
        const today = new Date();
        // Compare dates without time component
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const compareDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return compareDateOnly <= todayDateOnly;
    }, []);
    
    // Check if navigation to a date is allowed
    const canNavigateToDate = useCallback((date: Date): boolean => {
        if (isProUser) return true;
        return isDateAllowedForFreeUser(date);
    }, [isProUser, isDateAllowedForFreeUser]);

    // Reset add dialog
    const resetAddDialog = () => {
        setSelectedQuickAddFood(null);
        setAddFoodName("");
        setAddQuantity("");
        setAddMeasureUri("");
        setAddMeasureLabel("");
        setAddCategory(getDefaultCategory());
        setAddItemType("food");
        setAddFoodData(null);
        setAddRecipeData(null);
        setAddManualKcal("");
        setAddManualProtein("");
        setAddManualCarbs("");
        setAddManualFat("");
    };

    // Load foods when date changes
    useEffect(() => {
        fetchFoods(currentDate);
        fetchRecentFoods();
    }, [currentDate, fetchFoods, fetchRecentFoods]);

    // Navigate to previous day
    const handlePreviousDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    // Navigate to next day
    const handleNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 1);
        // For non-pro users, restrict to today or earlier
        if (canNavigateToDate(newDate)) {
            setCurrentDate(newDate);
        }
    };

    // Navigate to today
    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Handle date input change
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value + "T00:00:00");
        // For non-pro users, restrict to today or earlier
        if (canNavigateToDate(newDate)) {
            setCurrentDate(newDate);
        }
    };

    // Handle edit food
    const handleEditFood = (food: LoggedFood) => {
        setEditingFood(food);
        setEditQuantity(formatQuantity(food.quantity));
        setEditMeasureUri(food.measure_uri || "");
        // For recipes, ensure measure label is set to "serving" or "servings"
        if (food.item_type === "recipe") {
            const servingsLabel = food.quantity === 1 ? "serving" : "servings";
            setEditMeasureLabel(servingsLabel);
        } else {
            setEditMeasureLabel(food.measure_label || "");
        }
        setEditCategory(food.category);
        setIsEditDialogOpen(true);
    };

    // Handle save edit
    const handleSaveEdit = async () => {
        if (!editingFood) return;

        try {
            const updateData: {
                quantity: number;
                measureUri?: string;
                measureLabel?: string;
                category: string;
                nutrients?: Record<string, number>;
            } = {
                quantity: parseFloat(editQuantity),
                category: editCategory
            };

            // For food items, update measure if changed
            if (editingFood.item_type === "food") {
                if (editMeasureUri) {
                    updateData.measureUri = editMeasureUri;
                }
                if (editMeasureLabel) {
                    updateData.measureLabel = editMeasureLabel;
                }
                
                // If measure or quantity changed, recalculate nutrients
                if (editMeasureUri && (editMeasureUri !== editingFood.measure_uri || parseFloat(editQuantity) !== editingFood.quantity)) {
                    const foodData = editingFood.food_data as { measures?: Array<{ uri: string; weight: number }>; nutrients?: Record<string, number> };
                    const selectedMeasure = foodData?.measures?.find(m => m.uri === editMeasureUri);
                    const oldMeasure = foodData?.measures?.find(m => m.uri === editingFood.measure_uri);
                    
                    if (selectedMeasure && foodData?.nutrients) {
                        // Recalculate nutrients based on new quantity and measure
                        // Base nutrients are per 100g, so we need to calculate based on measure weight
                        const baseNutrients = foodData.nutrients;
                        const measureWeight = selectedMeasure.weight;
                        const quantity = parseFloat(editQuantity);
                        const totalWeight = (quantity * measureWeight) / 100;
                        
                        const recalculatedNutrients: Record<string, number> = {};
                        Object.keys(baseNutrients).forEach((key) => {
                            if (baseNutrients[key] !== undefined) {
                                recalculatedNutrients[key] = (baseNutrients[key] || 0) * totalWeight;
                            }
                        });
                        updateData.nutrients = recalculatedNutrients;
                    } else if (parseFloat(editQuantity) !== editingFood.quantity && editingFood.nutrients) {
                        // If only quantity changed (same measure), scale nutrients proportionally
                        const quantityMultiplier = parseFloat(editQuantity) / editingFood.quantity;
                        const recalculatedNutrients: Record<string, number> = {};
                        Object.keys(editingFood.nutrients).forEach((key) => {
                            recalculatedNutrients[key] = (editingFood.nutrients[key] || 0) * quantityMultiplier;
                        });
                        updateData.nutrients = recalculatedNutrients;
                    }
                } else if (parseFloat(editQuantity) !== editingFood.quantity && editingFood.nutrients) {
                    // If only quantity changed (no measure change), scale nutrients proportionally
                    const quantityMultiplier = parseFloat(editQuantity) / editingFood.quantity;
                    const recalculatedNutrients: Record<string, number> = {};
                    Object.keys(editingFood.nutrients).forEach((key) => {
                        recalculatedNutrients[key] = (editingFood.nutrients[key] || 0) * quantityMultiplier;
                    });
                    updateData.nutrients = recalculatedNutrients;
                }
            } else if (editingFood.item_type === "recipe") {
                // For recipes, always use "serving(s)" as measure and recalculate nutrients based on quantity
                const newQuantity = parseFloat(editQuantity);
                const oldQuantity = editingFood.quantity;
                
                // Update measure label to reflect plural/singular
                const servingsLabel = newQuantity === 1 ? "serving" : "servings";
                updateData.measureLabel = servingsLabel;
                
                // Recalculate nutrients proportionally based on quantity change
                if (newQuantity !== oldQuantity && editingFood.nutrients) {
                    const quantityMultiplier = newQuantity / oldQuantity;
                    const recalculatedNutrients: Record<string, number> = {};
                    Object.keys(editingFood.nutrients).forEach((key) => {
                        recalculatedNutrients[key] = (editingFood.nutrients[key] || 0) * quantityMultiplier;
                    });
                    updateData.nutrients = recalculatedNutrients;
                }
            }

            const response = await fetch(`/api/food-tracking/${editingFood.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                setIsEditDialogOpen(false);
                setEditingFood(null);
                await fetchFoods(currentDate);
                await fetchRecentFoods();
                toast.success("Food updated successfully!");
            }
        } catch (error) {
            console.error("Error updating food:", error);
            toast.error("Failed to update food. Please try again.");
        }
    };

    // Handle delete food - open confirmation dialog
    const handleDeleteFood = (food: LoggedFood) => {
        setFoodToDelete(food);
        setIsDeleteDialogOpen(true);
    };

    // Confirm and execute delete
    const handleConfirmDelete = async () => {
        if (!foodToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/food-tracking/${foodToDelete.id}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                setIsDeleteDialogOpen(false);
                setFoodToDelete(null);
                await fetchFoods(currentDate);
                await fetchRecentFoods();
                toast.success("Food deleted successfully!");
            }
        } catch (error) {
            console.error("Error deleting food:", error);
            toast.error("Failed to delete food. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Handle click on food item to view details
    const handleFoodClick = (food: LoggedFood) => {
        // Don't navigate if it's a manual entry (doesn't have a valid food_id that exists in database)
        if (food.food_id === "manual_entry" || food.food_id.startsWith("manual_")) {
            return;
        }
        
        if (food.item_type === "recipe") {
            navigate(`/dashboard/recipe-database/${food.food_id}`);
        } else {
            navigate(`/dashboard/food-database/${encodeURIComponent(food.food_id)}`);
        }
    };

    // Handle quick-add selection from dropdown
    const handleQuickAddSelect = (food: LoggedFood | null) => {
        setSelectedQuickAddFood(food);
        
        if (food) {
            // Populate form fields with selected food's data
            setAddFoodName(food.food_label);
            setAddQuantity(formatQuantity(food.quantity));
            setAddCategory(food.category || getDefaultCategory());
            setAddItemType(food.item_type as "food" | "recipe");
            
            // Clear manual macronutrients when selecting a quick-add item
            setAddManualKcal("");
            setAddManualProtein("");
            setAddManualCarbs("");
            setAddManualFat("");
            
            if (food.item_type === "recipe") {
                setAddRecipeData(food.recipe_data);
                setAddMeasureUri("");
                setAddMeasureLabel("serving(s)");
            } else {
                setAddFoodData(food.food_data);
                setAddMeasureUri(food.measure_uri || "");
                setAddMeasureLabel(food.measure_label || "");
            }
        } else {
            // Clear form when "Select..." is chosen
            setAddFoodName("");
            setAddQuantity("");
            setAddMeasureUri("");
            setAddMeasureLabel("");
            setAddCategory(getDefaultCategory());
            setAddItemType("food");
            setAddFoodData(null);
            setAddRecipeData(null);
            setAddManualKcal("");
            setAddManualProtein("");
            setAddManualCarbs("");
            setAddManualFat("");
        }
    };

    // Handle add food
    const handleAddFood = async () => {
        if (!addFoodName.trim() || !addQuantity) return;
        
        // Check if it's a true manual entry (no quick-add selected)
        const isManualEntry = !selectedQuickAddFood;
        // Check if it's a quick-add custom food (previously logged manual entry)
        const isQuickAddCustomFood = selectedQuickAddFood && selectedQuickAddFood.food_id.startsWith("manual_");
        
        setIsSaving(true);
        try {
            const dateStr = formatDateForAPI(currentDate);
            
            if (addItemType === "recipe") {
                // Recipe entry - calculate nutrients from recipe macros
                const servings = parseFloat(addQuantity);
                const recipeDataObj = addRecipeData && typeof addRecipeData === "object" ? addRecipeData as { macros?: Record<string, number | null | undefined> } : {};
                
                const nutrients: Record<string, number> = {};
                if (recipeDataObj.macros) {
                    Object.keys(recipeDataObj.macros).forEach((key) => {
                        const value = recipeDataObj.macros![key];
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
                
                // Determine measure label for recipe (singular/plural)
                const measureLabel = servings === 1 ? "serving" : "servings";
                
                const requestBody: Record<string, unknown> = {
                    itemType: "recipe",
                    foodId: isManualEntry ? `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : selectedQuickAddFood!.food_id,
                    foodLabel: addFoodName.trim(),
                    foodData: {}, // API requires foodData even for recipes
                    recipeData: addRecipeData || {},
                    quantity: servings,
                    measureLabel: measureLabel,
                    category: addCategory,
                    date: dateStr,
                    timezone: userTimezone,
                    nutrients: nutrients
                };

                const response = await fetch("/api/food-tracking", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    setIsAddDialogOpen(false);
                    resetAddDialog();
                    await fetchFoods(currentDate);
                    await fetchRecentFoods();
                    toast.success("Recipe added successfully!");
                }
            } else {
                // Food entry
                let foodId: string;
                let foodDataToSend: unknown;
                
                if (isManualEntry) {
                    // Manual entry
                    foodId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    foodDataToSend = {
                        label: addFoodName.trim(),
                        measures: [{
                            uri: "manual",
                            label: addMeasureLabel || "piece",
                            weight: 0
                        }]
                    };
                } else {
                    // Quick-add entry
                    foodId = selectedQuickAddFood!.food_id;
                    foodDataToSend = addFoodData || selectedQuickAddFood!.food_data || {};
                }

                // Build nutrients object
                const nutrients: Record<string, number> = {};
                if (isManualEntry) {
                    // True manual entry - use provided macronutrients (optional)
                    if (addManualKcal) {
                        const kcal = parseFloat(addManualKcal);
                        if (!isNaN(kcal) && kcal >= 0) {
                            nutrients.ENERC_KCAL = kcal;
                        }
                    }
                    if (addManualProtein) {
                        const protein = parseFloat(addManualProtein);
                        if (!isNaN(protein) && protein >= 0) {
                            nutrients.PROCNT = protein;
                        }
                    }
                    if (addManualCarbs) {
                        const carbs = parseFloat(addManualCarbs);
                        if (!isNaN(carbs) && carbs >= 0) {
                            nutrients.CHOCDF = carbs;
                        }
                    }
                    if (addManualFat) {
                        const fat = parseFloat(addManualFat);
                        if (!isNaN(fat) && fat >= 0) {
                            nutrients.FAT = fat;
                        }
                    }
                    // Set other nutrients to 0 if not provided
                    if (!nutrients.ENERC_KCAL) nutrients.ENERC_KCAL = 0;
                    if (!nutrients.PROCNT) nutrients.PROCNT = 0;
                    if (!nutrients.CHOCDF) nutrients.CHOCDF = 0;
                    if (!nutrients.FAT) nutrients.FAT = 0;
                    nutrients.FIBTG = 0;
                    nutrients.SUGAR = 0;
                    nutrients.NA = 0;
                    nutrients.K = 0;
                    nutrients.CHOLE = 0;
                    nutrients.FASAT = 0;
                    nutrients.FAMS = 0;
                    nutrients.FAPU = 0;
                } else if (isQuickAddCustomFood) {
                    // Quick-add custom food - scale nutrients based on quantity ratio
                    const oldQuantity = selectedQuickAddFood!.quantity;
                    const newQuantity = parseFloat(addQuantity);
                    const quantityRatio = oldQuantity > 0 ? newQuantity / oldQuantity : 1;
                    
                    const oldNutrients = selectedQuickAddFood!.nutrients || {};
                    
                    // Scale existing nutrients
                    Object.keys(oldNutrients).forEach((key) => {
                        const value = oldNutrients[key];
                        if (value !== undefined && value !== null && typeof value === "number") {
                            nutrients[key] = value * quantityRatio;
                        }
                    });
                    
                    // Ensure all main nutrients are set (even if 0) - but only if they weren't already set
                    if (nutrients.ENERC_KCAL === undefined) nutrients.ENERC_KCAL = 0;
                    if (nutrients.PROCNT === undefined) nutrients.PROCNT = 0;
                    if (nutrients.CHOCDF === undefined) nutrients.CHOCDF = 0;
                    if (nutrients.FAT === undefined) nutrients.FAT = 0;
                    if (nutrients.FIBTG === undefined) nutrients.FIBTG = 0;
                    if (nutrients.SUGAR === undefined) nutrients.SUGAR = 0;
                    if (nutrients.NA === undefined) nutrients.NA = 0;
                    if (nutrients.K === undefined) nutrients.K = 0;
                    if (nutrients.CHOLE === undefined) nutrients.CHOLE = 0;
                    if (nutrients.FASAT === undefined) nutrients.FASAT = 0;
                    if (nutrients.FAMS === undefined) nutrients.FAMS = 0;
                    if (nutrients.FAPU === undefined) nutrients.FAPU = 0;
                }
                // For non-manual quick-add entries, let the API calculate nutrients

                const requestBody: Record<string, unknown> = {
                    itemType: "food",
                    foodId: foodId,
                    foodLabel: addFoodName.trim(),
                    foodData: foodDataToSend || {},
                    quantity: parseFloat(addQuantity),
                    measureUri: addMeasureUri || (isManualEntry ? "manual" : null),
                    measureLabel: addMeasureLabel || "piece",
                    category: addCategory,
                    date: dateStr,
                    timezone: userTimezone
                };

                // Include nutrients for manual entries or quick-add custom entries
                if (isManualEntry || (selectedQuickAddFood && selectedQuickAddFood.food_id.startsWith("manual_"))) {
                    requestBody.nutrients = nutrients;
                }

                const response = await fetch("/api/food-tracking", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    setIsAddDialogOpen(false);
                    resetAddDialog();
                    await fetchFoods(currentDate);
                    await fetchRecentFoods();
                    toast.success("Food added successfully!");
                }
            }
        } catch (error) {
            console.error("Error adding food:", error);
            toast.error("Failed to add food. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Copy current day (Pro feature)
    const handleCopyDay = () => {
        if (!isProUser) return;
        const dateStr = formatDateForAPI(currentDate);
        setCopiedDate(dateStr);
        toast.success("Day copied!");
    };
    
    // Paste copied day to current date (Pro feature)
    const handlePasteDay = async () => {
        if (!isProUser || !copiedDate) return;
        
        const targetDateStr = formatDateForAPI(currentDate);
        if (copiedDate === targetDateStr) {
            return; // Cannot paste to same day
        }
        
        setIsPasting(true);
        try {
            const response = await fetch("/api/food-tracking/copy-day", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    sourceDate: copiedDate,
                    targetDate: targetDateStr,
                    timezone: userTimezone
                })
            });
            
            if (response.ok) {
                await fetchFoods(currentDate);
                toast.success("Day pasted successfully!");
            } else {
                const error = await response.json();
                console.error("Error pasting day:", error);
                toast.error("Failed to paste day. Please try again.");
            }
        } catch (error) {
            console.error("Error pasting day:", error);
            toast.error("Failed to paste day. Please try again.");
        } finally {
            setIsPasting(false);
        }
    };
    
    // Copy week (Pro feature)
    const handleCopyWeek = async () => {
        if (!isProUser || !copyWeekSourceStart || !copyWeekTargetStart) return;
        
        if (copyWeekSourceStart === copyWeekTargetStart) {
            return; // Cannot copy to same week
        }
        
        setIsCopyingWeek(true);
        try {
            const response = await fetch("/api/food-tracking/copy-week", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    sourceWeekStart: copyWeekSourceStart,
                    targetWeekStart: copyWeekTargetStart,
                    timezone: userTimezone
                })
            });
            
            if (response.ok) {
                setIsCopyWeekDialogOpen(false);
                setCopyWeekSourceStart("");
                setCopyWeekTargetStart("");
                // Refresh current view if it falls within the target week
                await fetchFoods(currentDate);
                toast.success("Week copied successfully!");
            } else {
                const error = await response.json();
                console.error("Error copying week:", error);
                toast.error("Failed to copy week. Please try again.");
            }
        } catch (error) {
            console.error("Error copying week:", error);
            toast.error("Failed to copy week. Please try again.");
        } finally {
            setIsCopyingWeek(false);
        }
    };
    
    // Drag and drop handlers (Pro feature)
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, food: LoggedFood) => {
        if (!isProUser) {
            e.preventDefault();
            return;
        }
        setDraggedFood(food);
        e.dataTransfer.effectAllowed = "move";
    };
    
    const handleDragEnd = () => {
        setDraggedFood(null);
        setDragOverCategory(null);
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, category: string) => {
        if (!isProUser || !draggedFood) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverCategory(category);
    };
    
    const handleDragLeave = () => {
        setDragOverCategory(null);
    };
    
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetCategory: string) => {
        e.preventDefault();
        if (!isProUser || !draggedFood) return;
        
        // Don't do anything if dropping on same category
        if (draggedFood.category === targetCategory) {
            setDraggedFood(null);
            setDragOverCategory(null);
            return;
        }
        
        // Store the food ID for the API call
        const foodId = draggedFood.id;
        const previousCategory = draggedFood.category;
        
        // Optimistic update - update local state immediately to prevent scroll reset
        setFoods(prevFoods => 
            prevFoods.map(food => 
                food.id === foodId 
                    ? { ...food, category: targetCategory }
                    : food
            )
        );
        
        // Clear drag state immediately for responsive feel
        setDraggedFood(null);
        setDragOverCategory(null);
        
        try {
            const response = await fetch(`/api/food-tracking/${foodId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    category: targetCategory
                })
            });
            
            // If the API call failed, revert the optimistic update
            if (!response.ok) {
                setFoods(prevFoods => 
                    prevFoods.map(food => 
                        food.id === foodId 
                            ? { ...food, category: previousCategory }
                            : food
                    )
                );
            }
        } catch (error) {
            console.error("Error moving food:", error);
            // Revert optimistic update on error
            setFoods(prevFoods => 
                prevFoods.map(food => 
                    food.id === foodId 
                        ? { ...food, category: previousCategory }
                        : food
                )
            );
        }
    };

    // Group foods by category
    const foodsByCategory = foods.reduce((acc, food) => {
        if (!acc[food.category]) {
            acc[food.category] = [];
        }
        acc[food.category].push(food);
        return acc;
    }, {} as Record<string, LoggedFood[]>);

    // Calculate totals for each category
    const calculateTotals = (categoryFoods: LoggedFood[]) => {
        return categoryFoods.reduce(
            (totals, food) => {
                const nutrients = food.nutrients || {};
                totals.calories += nutrients.ENERC_KCAL || 0;
                totals.protein += nutrients.PROCNT || 0;
                totals.carbs += nutrients.CHOCDF || 0;
                totals.fat += nutrients.FAT || 0;
                return totals;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
    };

    // Calculate grand totals
    const grandTotals = foods.reduce(
        (totals, food) => {
            const nutrients = food.nutrients || {};
            totals.calories += nutrients.ENERC_KCAL || 0;
            totals.protein += nutrients.PROCNT || 0;
            totals.carbs += nutrients.CHOCDF || 0;
            totals.fat += nutrients.FAT || 0;
            return totals;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo href="/dashboard" className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/food-tracking" />}
        >
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <Heading level={1}>Food Tracking</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Track your daily food intake and nutrition.
                    </Text>
                    <Text className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {formatDate(currentDate)}
                    </Text>
                </div>

                {/* Date Navigation */}
                <div className="space-y-3">
                    {/* Date picker row - on desktop includes Today button and Add Food for non-pro users */}
                    <div className="flex items-center gap-2">
                        <Button onClick={handlePreviousDay} outline>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Input
                            type="date"
                            value={formatDateForAPI(currentDate)}
                            onChange={handleDateChange}
                            max={!isProUser ? formatDateForAPI(new Date()) : undefined}
                            className="flex-1 sm:flex-none sm:w-auto"
                            aria-label="Select date"
                        />
                        <Button 
                            onClick={handleNextDay} 
                            outline
                            disabled={!isProUser && !canNavigateToDate(new Date(currentDate.getTime() + 86400000))}
                            title={!isProUser && !canNavigateToDate(new Date(currentDate.getTime() + 86400000)) ? "Pro feature: Plan meals for future days" : "Next day"}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                        {/* Today button - hidden on mobile, shown on desktop */}
                        <div className="hidden sm:block">
                            <Button onClick={handleToday} outline>
                                Today
                            </Button>
                        </div>
                        {/* Spacer to push buttons to the right */}
                        <div className="hidden sm:block sm:flex-1" />
                        {/* For Pro users: Copy & Paste and Add Food buttons on far right */}
                        {isProUser && (
                            <>
                                <div className="hidden sm:block">
                                    <Dropdown>
                                        <DropdownButton 
                                            outline
                                        >
                                            <Copy className="h-4 w-4" data-slot="icon" />
                                            Copy & Paste
                                            <ChevronDown className="h-4 w-4" data-slot="icon" />
                                        </DropdownButton>
                                        <DropdownMenu anchor="bottom start" className="min-w-48">
                                            <DropdownItem 
                                                onClick={handleCopyDay}
                                                disabled={foods.length === 0}
                                            >
                                                <Copy className="h-4 w-4" data-slot="icon" />
                                                <DropdownLabel>Copy Day</DropdownLabel>
                                            </DropdownItem>
                                            <DropdownItem 
                                                onClick={handlePasteDay}
                                                disabled={!copiedDate || copiedDate === formatDateForAPI(currentDate) || isPasting}
                                            >
                                                <ClipboardPaste className="h-4 w-4" data-slot="icon" />
                                                <DropdownLabel>{isPasting ? "Pasting..." : "Paste Day"}</DropdownLabel>
                                            </DropdownItem>
                                            <DropdownItem 
                                                onClick={() => setIsCopyWeekDialogOpen(true)}
                                            >
                                                <Calendar className="h-4 w-4" data-slot="icon" />
                                                <DropdownLabel>Copy Week</DropdownLabel>
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                                <div className="hidden sm:block">
                                    <Button 
                                        onClick={() => {
                                            resetAddDialog();
                                            setIsAddDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="h-4 w-4" data-slot="icon" />
                                        Add Food
                                    </Button>
                                </div>
                            </>
                        )}
                        {/* For non-pro users: Add Food button on far right */}
                        {!isProUser && (
                            <div className="hidden sm:block">
                                <Button 
                                    onClick={() => {
                                        resetAddDialog();
                                        setIsAddDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4" data-slot="icon" />
                                    Add Food
                                </Button>
                            </div>
                        )}
                    </div>
                    
                </div>

                {/* Grand Totals */}
                {foods.length > 0 && (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-6 dark:border-white/10 dark:bg-zinc-800/50">
                        <Heading level={2} className="mb-4 text-lg">
                            Daily Totals
                        </Heading>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">Calories</Text>
                                <Text className="text-xl font-semibold">{grandTotals.calories.toFixed(0)}</Text>
                            </div>
                            <div>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">Protein</Text>
                                <Text className="text-xl font-semibold">{grandTotals.protein.toFixed(1)} g</Text>
                            </div>
                            <div>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">Carbs</Text>
                                <Text className="text-xl font-semibold">{grandTotals.carbs.toFixed(1)} g</Text>
                            </div>
                            <div>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">Fat</Text>
                                <Text className="text-xl font-semibold">{grandTotals.fat.toFixed(1)} g</Text>
                            </div>
                        </div>
                    </div>
                )}

                {/* Foods by Category */}
                {isLoading ? (
                    <Text className="text-zinc-600 dark:text-zinc-400">Loading...</Text>
                ) : foods.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img 
                            src="https://cdn.nobull.fit/pantry.png" 
                            alt="No foods logged" 
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            No Foods Logged
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Log foods from the Food Database or Recipe Database pages to track your nutrition!
                        </Text>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {CATEGORIES.map((category) => {
                            const categoryFoods = foodsByCategory[category] || [];
                            const totals = calculateTotals(categoryFoods);
                            const isDragOver = dragOverCategory === category;
                            
                            // Non-pro users should not see empty categories
                            if (categoryFoods.length === 0 && !isProUser) {
                                return null;
                            }

                            return (
                                <div 
                                    key={category} 
                                    className={`space-y-4 rounded-lg transition-colors ${
                                        isDragOver 
                                            ? "bg-blue-50 ring-2 ring-blue-400 dark:bg-blue-900/20" 
                                            : ""
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, category)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, category)}
                                >
                                    <div className="flex items-center justify-between">
                                        <Heading level={2} className="text-lg">
                                            {category}
                                        </Heading>
                                        {categoryFoods.length > 0 && (
                                            <div className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                <span>{totals.calories.toFixed(0)} kcal</span>
                                                <span>{totals.protein.toFixed(1)}g protein</span>
                                            </div>
                                        )}
                                    </div>
                                    {categoryFoods.length === 0 ? (
                                        <div className={`rounded-lg border-2 border-dashed p-4 text-center ${
                                            isDragOver 
                                                ? "border-blue-400 bg-blue-100/50 dark:border-blue-500 dark:bg-blue-900/30" 
                                                : "border-zinc-200 dark:border-zinc-700"
                                        }`}>
                                            <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                                                {isProUser && draggedFood 
                                                    ? "Drop here to move to " + category
                                                    : `No ${category.toLowerCase()} logged`
                                                }
                                            </Text>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {categoryFoods.map((food) => {
                                                const nutrients = food.nutrients || {};
                                                const quantityDisplay = food.measure_label
                                                    ? `${formatQuantity(food.quantity)} ${food.measure_label}`
                                                    : formatQuantity(food.quantity);
                                                const isDragging = draggedFood?.id === food.id;

                                                return (
                                                    <div
                                                        key={food.id}
                                                        className={`group rounded-lg border bg-white p-4 dark:bg-zinc-800/50 ${
                                                            isDragging 
                                                                ? "border-blue-400 opacity-50 dark:border-blue-500" 
                                                                : "border-zinc-950/10 dark:border-white/10"
                                                        } ${isProUser ? "cursor-grab active:cursor-grabbing" : ""}`}
                                                        draggable={isProUser}
                                                        onDragStart={(e) => handleDragStart(e, food)}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            {/* Drag handle for Pro users */}
                                                            {isProUser && (
                                                                <div className="mr-3 flex items-center self-center text-zinc-400 dark:text-zinc-500">
                                                                    <GripVertical className="h-5 w-5" />
                                                                </div>
                                                            )}
                                                            <div
                                                                className="flex-1 cursor-pointer"
                                                                onClick={() => handleFoodClick(food)}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Text className="font-medium">{food.food_label}</Text>
                                                                    {food.item_type === "recipe" && (
                                                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                                                                            Recipe
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                                    {quantityDisplay}
                                                                </Text>
                                                                <div className="mt-2 flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                                                                    {nutrients.ENERC_KCAL !== undefined && (
                                                                        <span>{nutrients.ENERC_KCAL.toFixed(0)} kcal</span>
                                                                    )}
                                                                    {nutrients.PROCNT !== undefined && (
                                                                        <span>{nutrients.PROCNT.toFixed(1)}g protein</span>
                                                                    )}
                                                                    {nutrients.CHOCDF !== undefined && (
                                                                        <span>{nutrients.CHOCDF.toFixed(1)}g carbs</span>
                                                                    )}
                                                                    {nutrients.FAT !== undefined && (
                                                                        <span>{nutrients.FAT.toFixed(1)}g fat</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end">
                                                                <Dropdown>
                                                                    <DropdownButton
                                                                        plain
                                                                        className="p-2"
                                                                        aria-label="Food item options"
                                                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                                                                    >
                                                                        <MoreVertical className="h-5 w-5" />
                                                                    </DropdownButton>
                                                                    <DropdownMenu anchor="bottom end" className="min-w-40">
                                                                        <DropdownItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleEditFood(food);
                                                                            }}
                                                                        >
                                                                            <Pencil className="h-4 w-4" data-slot="icon" />
                                                                            <DropdownLabel>Edit</DropdownLabel>
                                                                        </DropdownItem>
                                                                        <DropdownItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteFood(food);
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" data-slot="icon" />
                                                                            <DropdownLabel>Delete</DropdownLabel>
                                                                        </DropdownItem>
                                                                    </DropdownMenu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onClose={setIsEditDialogOpen} size="xl">
                <DialogTitle>Edit {editingFood?.item_type === "recipe" ? "Recipe" : "Food Item"}</DialogTitle>
                <DialogDescription>
                    {editingFood?.item_type === "recipe" 
                        ? "Update the number of servings or category for this recipe."
                        : "Update the quantity, measure, or category for this food item."}
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-4">
                        {editingFood && editingFood.item_type === "recipe" ? (
                            <>
                                <Field>
                                    <FieldLabel>Servings</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        placeholder="e.g., 1, 2.3, 5.6"
                                    />
                                    <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Enter the number of servings. Nutrients will be calculated proportionally.
                                    </Text>
                                </Field>
                                <Field>
                                    <FieldLabel>Measure</FieldLabel>
                                    <Input
                                        type="text"
                                        value={editMeasureLabel}
                                        disabled
                                        className="bg-zinc-50 dark:bg-zinc-800/50"
                                    />
                                    <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Recipes are always measured in servings.
                                    </Text>
                                </Field>
                            </>
                        ) : editingFood && editingFood.item_type === "food" && editingFood.food_data && 
                         typeof editingFood.food_data === "object" && 
                         "measures" in editingFood.food_data && 
                         Array.isArray((editingFood.food_data as { measures?: unknown[] }).measures) &&
                         (editingFood.food_data as { measures: Array<{ uri: string; label: string; weight: number }> }).measures.length > 0 ? (
                            <>
                                <Field>
                                    <FieldLabel>Select Measure</FieldLabel>
                                    <Select
                                        value={editMeasureUri}
                                        onChange={(e) => {
                                            const selectedMeasure = (editingFood.food_data as { measures: Array<{ uri: string; label: string; weight: number }> }).measures.find(
                                                m => m.uri === e.target.value
                                            );
                                            if (selectedMeasure) {
                                                setEditMeasureUri(e.target.value);
                                                setEditMeasureLabel(selectedMeasure.label);
                                            }
                                        }}
                                    >
                                        <option value="">Select a measure...</option>
                                        {(editingFood.food_data as { measures: Array<{ uri: string; label: string; weight: number }> }).measures.map((measure) => (
                                            <option key={measure.uri} value={measure.uri}>
                                                {measure.label}{measure.weight > 0 ? ` (${measure.weight}g)` : ""}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel>Quantity</FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                        disabled={!editMeasureUri}
                                        placeholder={editMeasureLabel ? `Number of ${editMeasureLabel}` : "Select measure first"}
                                    />
                                    {editMeasureLabel && (
                                        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                            Enter how many {editMeasureLabel} you consumed.
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
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value)}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Measure</FieldLabel>
                                    <Input
                                        type="text"
                                        value={editMeasureLabel}
                                        onChange={(e) => setEditMeasureLabel(e.target.value)}
                                        placeholder="e.g., g, cup, piece"
                                    />
                                </Field>
                            </>
                        )}
                        <Field>
                            <FieldLabel>Category</FieldLabel>
                            <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
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
                    <Button plain onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={!editQuantity || (editingFood?.item_type === "food" && !editMeasureUri)}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Food Dialog */}
            <Dialog open={isAddDialogOpen} onClose={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                    resetAddDialog();
                }
            }} size="xl">
                <DialogTitle>Add Food</DialogTitle>
                <DialogDescription>
                    Log a food item or recipe for {formatDate(currentDate)}.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-4">
                        {/* Quick Add Select */}
                        {recentFoods.length > 0 && (
                            <Field>
                                <FieldLabel>Quick Add (Previously Logged)</FieldLabel>
                                <Select
                                    value={selectedQuickAddFood ? `${selectedQuickAddFood.item_type}:${selectedQuickAddFood.food_id}` : ""}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const [itemType, foodId] = e.target.value.split(":");
                                            const food = recentFoods.find(
                                                f => f.item_type === itemType && f.food_id === foodId
                                            );
                                            handleQuickAddSelect(food || null);
                                        } else {
                                            handleQuickAddSelect(null);
                                        }
                                    }}
                                    disabled={isSaving}
                                >
                                    <option value="">Select a previous food or recipe...</option>
                                    {[...recentFoods]
                                        .sort((a, b) => a.food_label.localeCompare(b.food_label))
                                        .map((food, index) => (
                                        <option key={`${food.item_type}-${food.food_id}-${index}`} value={`${food.item_type}:${food.food_id}`}>
                                            {food.food_label} {food.item_type === "recipe" ? "(Recipe)" : ""}
                                        </option>
                                    ))}
                                </Select>
                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Select a previously logged food or recipe to quickly fill the form, or enter manually below.
                                </Text>
                            </Field>
                        )}

                        {/* Food Name */}
                        <Field>
                            <FieldLabel>Food Name</FieldLabel>
                            <Input
                                type="text"
                                value={addFoodName}
                                onChange={(e) => setAddFoodName(e.target.value)}
                                placeholder="e.g., Apple, Homemade Sandwich"
                                disabled={isSaving}
                            />
                        </Field>

                        {/* Quantity */}
                        <Field>
                            <FieldLabel>Quantity</FieldLabel>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={addQuantity}
                                onChange={(e) => setAddQuantity(e.target.value)}
                                placeholder="e.g., 1, 2.5"
                                disabled={isSaving}
                            />
                        </Field>

                        {/* Measure (only for food items, not recipes) */}
                        {addItemType === "food" && (
                            <Field>
                                <FieldLabel>Measure</FieldLabel>
                                {addFoodData && typeof addFoodData === "object" && "measures" in addFoodData && Array.isArray((addFoodData as { measures?: unknown[] }).measures) && (addFoodData as { measures: Array<{ uri: string; label: string; weight: number }> }).measures.length > 0 ? (
                                    <Select
                                        value={addMeasureUri}
                                        onChange={(e) => {
                                            const selectedMeasure = (addFoodData as { measures: Array<{ uri: string; label: string; weight: number }> }).measures.find(
                                                m => m.uri === e.target.value
                                            );
                                            if (selectedMeasure) {
                                                setAddMeasureUri(e.target.value);
                                                setAddMeasureLabel(selectedMeasure.label);
                                            }
                                        }}
                                        disabled={isSaving}
                                    >
                                        <option value="">Select a measure...</option>
                                        {(addFoodData as { measures: Array<{ uri: string; label: string; weight: number }> }).measures.map((measure) => (
                                            <option key={measure.uri} value={measure.uri}>
                                                {measure.label}{measure.weight > 0 ? ` (${measure.weight}g)` : ""}
                                            </option>
                                        ))}
                                    </Select>
                                ) : (
                                    <>
                                        <Input
                                            type="text"
                                            value={addMeasureLabel}
                                            onChange={(e) => setAddMeasureLabel(e.target.value)}
                                            placeholder="e.g., serving, piece, cup"
                                            disabled={isSaving}
                                        />
                                        {!selectedQuickAddFood && (
                                            <Description>
                                                This measure will be used as the baseline for this food. When you log it again, macronutrients will scale based on this measure.
                                            </Description>
                                        )}
                                    </>
                                )}
                            </Field>
                        )}

                        {/* Category */}
                        <Field>
                            <FieldLabel>Category</FieldLabel>
                            <Select
                                value={addCategory}
                                onChange={(e) => setAddCategory(e.target.value)}
                                disabled={isSaving}
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        {/* Macronutrients for manual entries only (not quick-add) */}
                        {!selectedQuickAddFood && addItemType === "food" && addFoodName.trim() && (
                            <>
                                <div className="border-t border-zinc-950/10 pt-4 dark:border-white/10">
                                    <Text className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        Macronutrients (Optional, but recommended)
                                    </Text>
                                    <Text className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                                        Enter the macronutrients for the quantity and measure specified above. These values will be saved as the baseline and will scale automatically when you log different quantities later.
                                    </Text>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field>
                                            <FieldLabel>Calories (kcal)</FieldLabel>
                                            <Input
                                                type="number"
                                                step="1"
                                                min="0"
                                                value={addManualKcal}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                        setAddManualKcal(value);
                                                    }
                                                }}
                                                placeholder="e.g., 200"
                                                disabled={isSaving}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>Protein (g)</FieldLabel>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={addManualProtein}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                        setAddManualProtein(value);
                                                    }
                                                }}
                                                placeholder="e.g., 20.5"
                                                disabled={isSaving}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>Carbs (g)</FieldLabel>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={addManualCarbs}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                        setAddManualCarbs(value);
                                                    }
                                                }}
                                                placeholder="e.g., 30.2"
                                                disabled={isSaving}
                                            />
                                        </Field>
                                        <Field>
                                            <FieldLabel>Fat (g)</FieldLabel>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={addManualFat}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                                                        setAddManualFat(value);
                                                    }
                                                }}
                                                placeholder="e.g., 10.3"
                                                disabled={isSaving}
                                            />
                                        </Field>
                                    </div>
                                </div>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Note: Manual entries cannot be viewed in the Food Database.
                                </Text>
                            </>
                        )}
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => {
                        setIsAddDialogOpen(false);
                        resetAddDialog();
                    }} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddFood} 
                        disabled={isSaving || !addFoodName.trim() || !addQuantity || (addItemType === "food" && !addMeasureLabel)}
                    >
                        {isSaving ? "Adding..." : "Add Food"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onClose={setIsDeleteDialogOpen}>
                <DialogTitle>Delete Food Item</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete "{foodToDelete?.food_label}"? This action cannot be undone.
                </DialogDescription>
                <DialogBody>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                        This will permanently remove this item from your food tracking for this date.
                    </Text>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDelete} color="red" disabled={isDeleting}>
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Copy Week Dialog (Pro feature) */}
            <Dialog open={isCopyWeekDialogOpen} onClose={(open) => {
                setIsCopyWeekDialogOpen(open);
                if (!open) {
                    setCopyWeekSourceStart("");
                    setCopyWeekTargetStart("");
                }
            }}>
                <DialogTitle>
                    <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        Copy Week
                    </div>
                </DialogTitle>
                <DialogDescription>
                    Copy all meals from one week to another. Select the Monday of each week.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Source Week Start (Monday)</FieldLabel>
                            <Input
                                type="date"
                                value={copyWeekSourceStart}
                                onChange={(e) => setCopyWeekSourceStart(e.target.value)}
                                disabled={isCopyingWeek}
                            />
                            <Description>
                                Select the Monday of the week you want to copy from.
                            </Description>
                        </Field>
                        <Field>
                            <FieldLabel>Target Week Start (Monday)</FieldLabel>
                            <Input
                                type="date"
                                value={copyWeekTargetStart}
                                onChange={(e) => setCopyWeekTargetStart(e.target.value)}
                                disabled={isCopyingWeek}
                            />
                            <Description>
                                Select the Monday of the week you want to copy to.
                            </Description>
                        </Field>
                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                            Note: Existing meals on the target week will not be removed. The copied meals will be added alongside them.
                        </Text>
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button 
                        plain 
                        onClick={() => {
                            setIsCopyWeekDialogOpen(false);
                            setCopyWeekSourceStart("");
                            setCopyWeekTargetStart("");
                        }}
                        disabled={isCopyingWeek}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCopyWeek}
                        disabled={!copyWeekSourceStart || !copyWeekTargetStart || copyWeekSourceStart === copyWeekTargetStart || isCopyingWeek}
                    >
                        {isCopyingWeek ? "Copying..." : "Copy Week"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mobile Bottom Menu */}
            <MobileBottomMenu
                items={(() => {
                    const menuItems: MobileBottomMenuItem[] = [
                        {
                            id: "add-food",
                            label: "Add Food",
                            icon: <Plus className="h-5 w-5" />,
                            onClick: () => {
                                resetAddDialog();
                                setIsAddDialogOpen(true);
                            }
                        }
                    ];

                    // Pro-only features
                    if (isProUser) {
                        menuItems.push(
                            {
                                id: "copy-day",
                                label: "Copy Day",
                                icon: <Copy className="h-5 w-5" />,
                                onClick: handleCopyDay,
                                disabled: foods.length === 0
                            },
                            {
                                id: "paste-day",
                                label: isPasting ? "Pasting..." : "Paste Day",
                                icon: <ClipboardPaste className="h-5 w-5" />,
                                onClick: handlePasteDay,
                                disabled: !copiedDate || copiedDate === formatDateForAPI(currentDate) || isPasting
                            },
                            {
                                id: "copy-week",
                                label: "Copy Week",
                                icon: <Calendar className="h-5 w-5" />,
                                onClick: () => setIsCopyWeekDialogOpen(true)
                            }
                        );
                    }

                    return menuItems;
                })()}
            />
            <MobileBottomMenuSpacer />
        </SidebarLayout>
    );
};

export default FoodTracking;
