import React, { useState, FormEvent, useEffect } from "react";
import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate, useLocation, useParams } from "react-router-dom";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Field, Label as FieldLabel, Label, Description, ErrorMessage } from "@components/fieldset";
import { CheckboxField, Checkbox } from "@components/checkbox";
import { Select } from "@components/select";
import { containsEmoji } from "@utils/emojiValidation";
import RecipeMacrosInput, { RecipeMacros } from "@core/components/RecipeMacrosInput";
import { Ingredient, getAllUnits } from "@utils/ingredientUnits";
import { RecipeTagKey, RECIPE_TAGS, getTagsByCategory } from "@utils/recipeTags";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from "@components/dialog";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { toast } from "sonner";

interface Recipe {
    id: number;
    name: string;
    description: string | null;
    ingredients: string[];
    steps: string[];
    image_filename: string | null;
    macros?: RecipeMacros | null;
    servings?: number | null;
    cooking_time_minutes?: number | null;
    tags?: RecipeTagKey[];
    is_public: boolean;
    is_verified?: boolean;
}

const CreateRecipe: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: unknown[] };
    const helmet = useHelmet();
    const navigate = useNavigate();
    const location = useLocation();
    const { recipeId } = useParams<{ recipeId?: string }>();
    const isEditMode = !!recipeId;
    const duplicateRecipe = (location.state as { duplicateRecipe?: Recipe })?.duplicateRecipe;

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [ingredients, setIngredients] = useState<Ingredient[]>([{ quantity: null, unit: "", name: "" }]);
    const [steps, setSteps] = useState<string[]>([""]);
    const [isPublic, setIsPublic] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFilename, setImageFilename] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [wasPublicAndVerified, setWasPublicAndVerified] = useState(false);
    const [macros, setMacros] = useState<RecipeMacros>({});
    const [servings, setServings] = useState<number | null>(null);
    const [cookingTimeMinutes, setCookingTimeMinutes] = useState<number | null>(null);
    const [selectedTags, setSelectedTags] = useState<Set<RecipeTagKey>>(new Set());
    const [expandedTagCategories, setExpandedTagCategories] = useState<Record<string, boolean>>({
        "Diet Labels": false,
        "Health Labels": false,
        "Allergen-Free": false,
        "Meal Types": true,
        "Cuisine Types": false,
        "Cooking Methods": false,
        "Other": false
    });
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [recipeStats, setRecipeStats] = useState<{ is_public: boolean; favorite_count: number } | null>(null);
    
    // Validation errors
    const [nameError, setNameError] = useState<string | null>(null);
    const [descriptionError, setDescriptionError] = useState<string | null>(null);
    const [ingredientErrors, setIngredientErrors] = useState<Record<number, string>>({});
    const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
    
    // Character limits
    const MAX_NAME_LENGTH = 100;
    const MAX_DESCRIPTION_LENGTH = 2000;
    const MAX_INGREDIENT_LENGTH = 500;
    const MAX_STEP_LENGTH = 1000;

    // Load recipe data for editing or pre-fill for duplicating
    useEffect(() => {
        if (isEditMode && recipeId) {
            // Load recipe for editing
            fetch(`/api/recipes/${recipeId}`, {
                credentials: "include"
            })
                .then(res => res.json())
                .then(data => {
                    if (data.recipe) {
                        const recipe = data.recipe;
                        setName(recipe.name || "");
                        setDescription(recipe.description || "");
// Handle both old string format and new structured format
                            if (recipe.ingredients && recipe.ingredients.length > 0) {
                                const parsedIngredients = recipe.ingredients.map((ing: string | Ingredient) => {
                                    if (typeof ing === "string") {
                                        // Old format - try to parse or use as name
                                        return { quantity: null, unit: "", name: ing };
                                    }
                                    // Ensure unit property exists (handle ingredients saved without unit)
                                    return { ...ing, unit: ing.unit || "" };
                                });
                                setIngredients(parsedIngredients);
                        } else {
                            setIngredients([{ quantity: null, unit: "", name: "" }]);
                        }
                        setSteps(recipe.steps && recipe.steps.length > 0 ? recipe.steps : [""]);
                        setIsPublic(recipe.is_public || false);
                        setWasPublicAndVerified(recipe.is_public && recipe.is_verified === true);
                        if (recipe.image_filename) {
                            setImageFilename(recipe.image_filename);
                            setImagePreview(`https://cdn.nobull.fit/recipes/${recipe.image_filename}`);
                        }
                        if (recipe.macros) {
                            setMacros(recipe.macros);
                        }
                        if (recipe.servings !== undefined && recipe.servings !== null) {
                            setServings(recipe.servings);
                        }
                        if (recipe.cooking_time_minutes !== undefined && recipe.cooking_time_minutes !== null) {
                            setCookingTimeMinutes(recipe.cooking_time_minutes);
                        }
                        if (recipe.tags && Array.isArray(recipe.tags)) {
                            setSelectedTags(new Set(recipe.tags));
                        }
                        // Store recipe stats for delete dialog
                        setRecipeStats({
                            is_public: recipe.is_public || false,
                            favorite_count: recipe.favorite_count || 0
                        });
                    }
                })
                .catch(err => {
                    console.error("Error loading recipe:", err);
                    toast.error("Failed to load recipe");
                });
        } else if (duplicateRecipe) {
            // Pre-fill form with duplicate recipe data
            setName(duplicateRecipe.name || "");
            setDescription(duplicateRecipe.description || "");
            // Handle both old string format and new structured format
            if (duplicateRecipe.ingredients && duplicateRecipe.ingredients.length > 0) {
                const parsedIngredients = duplicateRecipe.ingredients.map((ing: string | Ingredient) => {
                    if (typeof ing === "string") {
                        return { quantity: null, unit: "", name: ing };
                    }
                    // Ensure unit property exists (handle ingredients saved without unit)
                    return { ...ing, unit: ing.unit || "" };
                });
                setIngredients(parsedIngredients);
            } else {
                setIngredients([{ quantity: null, unit: "", name: "" }]);
            }
            setSteps(duplicateRecipe.steps && duplicateRecipe.steps.length > 0 ? duplicateRecipe.steps : [""]);
            setIsPublic(duplicateRecipe.is_public || false);
            // Copy the image filename so the duplicated recipe uses the same image
            if (duplicateRecipe.image_filename) {
                setImageFilename(duplicateRecipe.image_filename);
                setImagePreview(`https://cdn.nobull.fit/recipes/${duplicateRecipe.image_filename}`);
            }
            if (duplicateRecipe.macros) {
                setMacros(duplicateRecipe.macros);
            }
            if (duplicateRecipe.servings !== undefined && duplicateRecipe.servings !== null) {
                setServings(duplicateRecipe.servings);
            }
            if (duplicateRecipe.cooking_time_minutes !== undefined && duplicateRecipe.cooking_time_minutes !== null) {
                setCookingTimeMinutes(duplicateRecipe.cooking_time_minutes);
            }
            if (duplicateRecipe.tags && Array.isArray(duplicateRecipe.tags)) {
                setSelectedTags(new Set(duplicateRecipe.tags));
            }
        }
    }, [isEditMode, recipeId, duplicateRecipe]);

    const handleAddIngredient = () => {
        setIngredients([...ingredients, { quantity: null, unit: "", name: "" }]);
    };

    const handleRemoveIngredient = (index: number) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients.length > 0 ? newIngredients : [{ quantity: null, unit: "g", name: "" }]);
    };

    const handleIngredientQuantityChange = (index: number, value: string) => {
        const newIngredients = [...ingredients];
        
        // Allow empty
        if (value === "") {
            newIngredients[index] = {
                ...newIngredients[index],
                quantity: null
            };
            setIngredients(newIngredients);
            return;
        }
        
        // Allow typing intermediate states (e.g., "1/", "2 ", "1 1/", "1.5")
        // More lenient regex that allows incomplete fractions and decimals while typing
        const typingRegex = /^(\d+\s*)?(\d*\/?\d*)?(\.\d*)?$/;
        
        if (typingRegex.test(value.trim())) {
            newIngredients[index] = {
                ...newIngredients[index],
                quantity: value.trim()
            };
            setIngredients(newIngredients);
        }
        // If it doesn't match, don't update (prevents invalid characters)
    };

    const handleIngredientUnitChange = (index: number, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = {
            ...newIngredients[index],
            unit: value
        };
        setIngredients(newIngredients);
    };

    const handleIngredientNameChange = (index: number, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = {
            ...newIngredients[index],
            name: value
        };
        setIngredients(newIngredients);
        
        // Validate ingredient name
        if (containsEmoji(value)) {
            setIngredientErrors(prev => ({
                ...prev,
                [index]: "Ingredient name cannot contain emojis"
            }));
        } else if (value.length > MAX_INGREDIENT_LENGTH) {
            setIngredientErrors(prev => ({
                ...prev,
                [index]: `Ingredient name must be ${MAX_INGREDIENT_LENGTH} characters or less`
            }));
        } else {
            setIngredientErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
            });
        }
    };

    const handleAddStep = () => {
        setSteps([...steps, ""]);
    };

    const handleRemoveStep = (index: number) => {
        if (steps.length > 1) {
            setSteps(steps.filter((_, i) => i !== index));
        }
    };

    const handleStepChange = (index: number, value: string) => {
        const newSteps = [...steps];
        newSteps[index] = value;
        setSteps(newSteps);
        
        // Validate step
        if (containsEmoji(value)) {
            setStepErrors(prev => ({
                ...prev,
                [index]: "Step cannot contain emojis"
            }));
        } else if (value.length > MAX_STEP_LENGTH) {
            setStepErrors(prev => ({
                ...prev,
                [index]: `Step must be ${MAX_STEP_LENGTH} characters or less`
            }));
        } else {
            setStepErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[index];
                return newErrors;
            });
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            setImageFile(null);
            setImagePreview(null);
            setImageFilename(null);
            return;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setImageFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload image
        setIsUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("image", file);

            const response = await fetch("/api/recipes/upload-image", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to upload image");
            }

            const data = await response.json();
            setImageFilename(data.filename);
        } catch (err) {
            console.error("Error uploading image:", err);
            toast.error(err instanceof Error ? err.message : "Failed to upload image");
            setImageFile(null);
            setImagePreview(null);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageFilename(null);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setNameError(null);
        setDescriptionError(null);
        setIngredientErrors({});
        setStepErrors({});

        // Validate recipe name
        const trimmedName = name.trim();
        if (!trimmedName) {
            setNameError("Recipe name is required");
            return;
        }
        if (trimmedName.length > MAX_NAME_LENGTH) {
            setNameError(`Recipe name must be ${MAX_NAME_LENGTH} characters or less`);
            return;
        }

        // Validate description
        const trimmedDescription = description.trim();
        if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
            setDescriptionError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
            return;
        }
        if (trimmedDescription && containsEmoji(trimmedDescription)) {
            setDescriptionError("Description cannot contain emojis");
            return;
        }

        // Validate ingredients
        const filteredIngredients = ingredients.filter(ing => ing.name.trim().length > 0);
        if (filteredIngredients.length === 0) {
            toast.error("At least one ingredient is required");
            return;
        }
        
        // Check for ingredient emojis and validation errors
        for (let i = 0; i < filteredIngredients.length; i++) {
            if (containsEmoji(filteredIngredients[i].name)) {
                toast.error(`Ingredient ${i + 1} name cannot contain emojis`);
                return;
            }
            if (filteredIngredients[i].name.length > MAX_INGREDIENT_LENGTH) {
                toast.error(`Ingredient ${i + 1} name must be ${MAX_INGREDIENT_LENGTH} characters or less`);
                return;
            }
        }
        
        if (Object.keys(ingredientErrors).length > 0) {
            toast.error("Please fix ingredient errors");
            return;
        }

        // Validate steps
        const filteredSteps = steps.filter(step => step.trim().length > 0);
        if (filteredSteps.length === 0) {
            toast.error("At least one step is required");
            return;
        }
        
        // Check for step emojis
        for (let i = 0; i < filteredSteps.length; i++) {
            if (containsEmoji(filteredSteps[i])) {
                toast.error(`Step ${i + 1} cannot contain emojis`);
                return;
            }
        }
        
        // Check for step length errors
        const invalidSteps = filteredSteps.some((step, idx) => {
            const originalIdx = steps.indexOf(step);
            return step.length > MAX_STEP_LENGTH || stepErrors[originalIdx];
        });
        if (invalidSteps || Object.keys(stepErrors).length > 0) {
            toast.error("Please fix step length errors");
            return;
        }

        setIsSubmitting(true);

        try {
            const url = isEditMode ? `/api/recipes/${recipeId}` : "/api/recipes";
            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    name: trimmedName,
                    description: trimmedDescription || null,
                    ingredients: filteredIngredients,
                    steps: filteredSteps,
                    imageFilename,
                    macros: Object.keys(macros).length > 0 ? macros : null,
                    servings: servings !== null && servings > 0 ? servings : null,
                    cookingTimeMinutes: cookingTimeMinutes !== null && cookingTimeMinutes > 0 ? cookingTimeMinutes : null,
                    tags: Array.from(selectedTags),
                    isPublic
                })
            });

            if (!response.ok) {
                const data = await response.json();
                const errorMessage = data.error || `Failed to ${isEditMode ? "update" : "create"} recipe`;
                
                // Handle specific validation errors from server
                if (errorMessage.includes("too long") || errorMessage.includes("character")) {
                    if (errorMessage.includes("name") || errorMessage.includes("varchar")) {
                        setNameError(`Recipe name must be ${MAX_NAME_LENGTH} characters or less`);
                    } else {
                        toast.error(errorMessage);
                    }
                } else {
                    toast.error(errorMessage);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            toast.success(`Recipe ${isEditMode ? "updated" : "created"} successfully!`);
            navigate(`/dashboard/recipe-database/${data.recipe.id}`);
        } catch (err) {
            console.error(`Error ${isEditMode ? "updating" : "creating"} recipe:`, err);
            // Error already shown via toast above
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRecipe = async () => {
        if (!recipeId) return;

        setIsDeleting(true);

        try {
            const response = await fetch(`/api/recipes/${recipeId}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete recipe");
            }

            toast.success("Recipe deleted successfully!");
            // Navigate back to recipe database after successful deletion
            navigate("/dashboard/recipe-database");
        } catch (err) {
            console.error("Error deleting recipe:", err);
            toast.error(err instanceof Error ? err.message : "Failed to delete recipe. Please try again.");
            setIsDeleting(false);
        }
    };

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
            sidebar={<DashboardSidebar currentPath="/dashboard/recipe-database" />}
        >
            <div className="space-y-6">
                <div>
                    <Heading level={1}>{isEditMode ? "Edit Recipe" : duplicateRecipe ? "Duplicate Recipe" : "Create Recipe"}</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        {isEditMode 
                            ? "Update your recipe details."
                            : duplicateRecipe
                            ? "Create your own version of this recipe."
                            : "Create a new recipe to share with the community or keep it private."}
                    </Text>
                </div>

                {isEditMode && wasPublicAndVerified && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-50 p-4 dark:bg-amber-950/10">
                        <Text className="text-amber-800 dark:text-amber-200 font-medium">
                            ⚠️ Verification Notice
                        </Text>
                        <Text className="text-amber-700 dark:text-amber-300 mt-1 text-sm">
                            This recipe is currently verified. Any changes you make will remove its verified status, and it will need to be reviewed again before it can be verified.
                        </Text>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Information Section */}
                    <section className="space-y-6">
                        <div>
                            <Heading level={2} className="text-lg font-semibold mb-1">Basic Information</Heading>
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                Provide the essential details about your recipe.
                            </Text>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Name and Description */}
                            <div className="lg:col-span-2 space-y-4">
                                <Field>
                                    <FieldLabel>Recipe Name *</FieldLabel>
                                    <Input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (nameError) setNameError(null);
                                            if (e.target.value.length > MAX_NAME_LENGTH) {
                                                setNameError(`Recipe name must be ${MAX_NAME_LENGTH} characters or less`);
                                            } else if (containsEmoji(e.target.value)) {
                                                setNameError("Recipe name cannot contain emojis");
                                            }
                                        }}
                                        placeholder="e.g., Chocolate Chip Cookies"
                                        maxLength={MAX_NAME_LENGTH}
                                        required
                                    />
                                    {nameError && <ErrorMessage>{nameError}</ErrorMessage>}
                                    <Description>
                                        {name.length}/{MAX_NAME_LENGTH} characters
                                    </Description>
                                </Field>

                                <Field>
                                    <FieldLabel>Description</FieldLabel>
                                    <textarea
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                            if (descriptionError) setDescriptionError(null);
                                            if (e.target.value.length > MAX_DESCRIPTION_LENGTH) {
                                                setDescriptionError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
                                            } else if (containsEmoji(e.target.value)) {
                                                setDescriptionError("Description cannot contain emojis");
                                            }
                                        }}
                                        placeholder="Optional description of your recipe..."
                                        className="w-full rounded-lg border border-zinc-950/10 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-blue-500"
                                        rows={4}
                                        maxLength={MAX_DESCRIPTION_LENGTH}
                                    />
                                    {descriptionError && <ErrorMessage>{descriptionError}</ErrorMessage>}
                                    <Description>
                                        {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                                    </Description>
                                </Field>
                            </div>

                            {/* Right Column - Image */}
                            <div className="lg:col-span-1">
                                <Field>
                                    <FieldLabel>Recipe Image</FieldLabel>
                                    {imagePreview ? (
                                        <div className="space-y-2">
                                            <img 
                                                src={imagePreview} 
                                                alt="Recipe preview" 
                                                className="w-full h-48 object-cover rounded-lg border border-zinc-950/10 dark:border-white/10"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                color="red"
                                                disabled={isUploadingImage}
                                                className="w-full"
                                            >
                                                Remove Image
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                disabled={isUploadingImage || isSubmitting}
                                                className="cursor-pointer"
                                            />
                                            {isUploadingImage && (
                                                <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                    Uploading...
                                                </Text>
                                            )}
                                            <Description>
                                                Max 5MB. JPG, PNG, GIF, WebP
                                            </Description>
                                        </>
                                    )}
                                </Field>
                            </div>
                        </div>
                    </section>

                    {/* Recipe Details Section */}
                    <section className="space-y-6">
                        <div>
                            <Heading level={2} className="text-lg font-semibold mb-1">Recipe Details</Heading>
                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                Additional information to help others understand your recipe.
                            </Text>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field>
                                <FieldLabel>Servings</FieldLabel>
                                <Input
                                    type="number"
                                    min="1"
                                    value={servings !== null ? servings.toString() : ""}
                                    onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                        setServings(value !== null && !isNaN(value) && value > 0 ? value : null);
                                    }}
                                    placeholder="e.g., 4"
                                    className="w-full"
                                />
                                <Description>Number of portions this recipe makes</Description>
                            </Field>

                            <Field>
                                <FieldLabel>Cooking Time</FieldLabel>
                                <Input
                                    type="number"
                                    min="1"
                                    value={cookingTimeMinutes !== null ? cookingTimeMinutes.toString() : ""}
                                    onChange={(e) => {
                                        const value = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                        setCookingTimeMinutes(value !== null && !isNaN(value) && value > 0 ? value : null);
                                    }}
                                    placeholder="e.g., 30"
                                    className="w-full"
                                />
                                <Description>Total cooking time in minutes</Description>
                            </Field>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Heading level={3} className="text-base">Tags (Optional)</Heading>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                                    Select tags to help others find your recipe.
                                </Text>
                            </div>
                            {Object.entries(getTagsByCategory())
                                .sort(([categoryA], [categoryB]) => {
                                    // Move "Meal Types" to the front
                                    if (categoryA === "Meal Types") return -1;
                                    if (categoryB === "Meal Types") return 1;
                                    return 0;
                                })
                                .map(([category, tagKeys]) => {
                                const isExpanded = expandedTagCategories[category] || false;
                                const categoryHasSelectedTags = tagKeys.some(tagKey => selectedTags.has(tagKey));
                                
                                return (
                                    <div key={category} className="border border-zinc-950/10 rounded-lg dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedTagCategories(prev => ({
                                                ...prev,
                                                [category]: !prev[category]
                                            }))}
                                            className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors rounded-t-lg"
                                        >
                                            <Heading level={4} className="text-sm font-medium">
                                                {category}
                                            </Heading>
                                            <div className="flex items-center gap-2">
                                                {categoryHasSelectedTags && (
                                                    <span className="text-xs text-green-600 dark:text-green-400">•</span>
                                                )}
                                                {isExpanded ? (
                                                    <ChevronUp className="size-4 text-zinc-500" />
                                                ) : (
                                                    <ChevronDown className="size-4 text-zinc-500" />
                                                )}
                                            </div>
                                        </button>
                                        
                                        <div
                                            className={`overflow-hidden transition-all duration-200 ${
                                                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                                            }`}
                                        >
                                            <div className="p-4 border-t border-zinc-950/10 dark:border-white/10">
                                                <div className="flex flex-wrap gap-2">
                                                    {tagKeys.map((tagKey) => {
                                                        const isSelected = selectedTags.has(tagKey);
                                                        return (
                                                            <button
                                                                key={tagKey}
                                                                type="button"
                                                                onClick={() => {
                                                                    const newTags = new Set(selectedTags);
                                                                    if (isSelected) {
                                                                        newTags.delete(tagKey);
                                                                    } else {
                                                                        newTags.add(tagKey);
                                                                    }
                                                                    setSelectedTags(newTags);
                                                                }}
                                                                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                                                                    isSelected
                                                                        ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/20 dark:border-blue-500 dark:text-blue-300"
                                                                        : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                                }`}
                                                            >
                                                                {RECIPE_TAGS[tagKey] || tagKey}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Ingredients Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Heading level={2} className="text-lg font-semibold mb-1">Ingredients *</Heading>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    List all ingredients needed for this recipe.
                                </Text>
                            </div>
                            <Button type="button" onClick={handleAddIngredient} outline className="text-sm">
                                Add Ingredient
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {ingredients.map((ingredient, index) => (
                                <div key={index} className="space-y-2 p-4 border border-zinc-950/10 rounded-lg dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                        <div className="sm:col-span-3">
                                            <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Quantity</label>
                                            <Input
                                                type="text"
                                                value={ingredient.quantity !== null ? ingredient.quantity.toString() : ""}
                                                onChange={(e) => handleIngredientQuantityChange(index, e.target.value)}
                                                placeholder="e.g., 1, 1/2"
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Unit</label>
                                            <Select
                                                value={ingredient.unit || ""}
                                                onChange={(e) => handleIngredientUnitChange(index, e.target.value)}
                                                className="w-full"
                                            >
                                                <option value="">No unit</option>
                                                {getAllUnits().map((unit) => (
                                                    <option key={unit.key} value={unit.key}>
                                                        {unit.label}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div className="sm:col-span-5">
                                            <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 block">Ingredient Name</label>
                                            <Input
                                                type="text"
                                                value={ingredient.name}
                                                onChange={(e) => handleIngredientNameChange(index, e.target.value)}
                                                placeholder={`Ingredient name ${index + 1}`}
                                                className="w-full"
                                                maxLength={MAX_INGREDIENT_LENGTH}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-1 flex items-end">
                                            {ingredients.length > 1 && (
                                                <Button
                                                    type="button"
                                                    onClick={() => {
                                                        handleRemoveIngredient(index);
                                                        setIngredientErrors(prev => {
                                                            const newErrors = { ...prev };
                                                            delete newErrors[index];
                                                            return newErrors;
                                                        });
                                                    }}
                                                    color="red"
                                                    className="w-full"
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {ingredientErrors[index] && (
                                        <Text className="text-sm text-red-600 dark:text-red-400">
                                            {ingredientErrors[index]}
                                        </Text>
                                    )}
                                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {ingredient.name.length}/{MAX_INGREDIENT_LENGTH} characters
                                    </Text>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Instructions Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Heading level={2} className="text-lg font-semibold mb-1">Instructions *</Heading>
                                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                    Provide step-by-step instructions for preparing this recipe.
                                </Text>
                            </div>
                            <Button type="button" onClick={handleAddStep} outline className="text-sm">
                                Add Step
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {steps.map((step, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Input
                                                type="text"
                                                value={step}
                                                onChange={(e) => handleStepChange(index, e.target.value)}
                                                placeholder={`Step ${index + 1}`}
                                                className="w-full"
                                                maxLength={MAX_STEP_LENGTH}
                                            />
                                            {stepErrors[index] && (
                                                <Text className="text-sm text-red-600 dark:text-red-400">
                                                    {stepErrors[index]}
                                                </Text>
                                            )}
                                            <Text className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {step.length}/{MAX_STEP_LENGTH} characters
                                            </Text>
                                        </div>
                                        {steps.length > 1 && (
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    handleRemoveStep(index);
                                                    setStepErrors(prev => {
                                                        const newErrors = { ...prev };
                                                        delete newErrors[index];
                                                        return newErrors;
                                                    });
                                                }}
                                                color="red"
                                                className="flex-shrink-0 mt-1"
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Nutritional Information Section */}
                    <section className="space-y-4">
                        <RecipeMacrosInput macros={macros} onChange={setMacros} />
                    </section>

                    {/* Privacy Settings */}
                    <section className="border-t border-zinc-950/10 dark:border-white/10 pt-6">
                        <CheckboxField>
                            <Checkbox
                                checked={isPublic}
                                onChange={setIsPublic}
                            />
                            <Label>Make this recipe public</Label>
                            <Description>
                                Public recipes can be viewed and searched by all users. 
                                {isEditMode && wasPublicAndVerified && (
                                    <span className="block mt-1 text-amber-600 dark:text-amber-400">
                                        ⚠️ Note: Editing this recipe will remove its verified status. It will need to be reviewed again.
                                    </span>
                                )}
                                {!isEditMode && (
                                    <span className="block mt-1 text-zinc-500 dark:text-zinc-400">
                                        Public recipes may be reviewed and verified by administrators.
                                    </span>
                                )}
                            </Description>
                        </CheckboxField>
                    </section>

                    {/* Form Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-950/10 dark:border-white/10">
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                                {isSubmitting 
                                    ? (isEditMode ? "Updating..." : "Creating...") 
                                    : (isEditMode ? "Update Recipe" : "Create Recipe")}
                            </Button>
                            <Button 
                                type="button" 
                                onClick={() => {
                                    if (isEditMode && recipeId) {
                                        navigate(`/dashboard/recipe-database/${recipeId}`);
                                    } else {
                                        navigate("/dashboard/recipe-database");
                                    }
                                }} 
                                outline
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                        </div>
                        {isEditMode && (
                            <Button 
                                type="button"
                                onClick={() => setShowDeleteDialog(true)}
                                color="red"
                                className="w-full sm:w-auto"
                            >
                                Delete Recipe
                            </Button>
                        )}
                    </div>
                </form>

                {/* Delete Recipe Dialog */}
                {isEditMode && (
                    <Dialog open={showDeleteDialog} onClose={() => {
                        if (!isDeleting) {
                            setShowDeleteDialog(false);
                        }
                    }}>
                        <DialogTitle>Delete Recipe</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this recipe? This action cannot be undone.
                        </DialogDescription>
                        <DialogBody>
                            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20 mb-4">
                                <Text className="mb-3 font-semibold text-red-900 dark:text-red-400">
                                    Warning: This action cannot be undone
                                </Text>
                                <Text className="mb-2 text-sm text-red-800 dark:text-red-300">
                                    Deleting this recipe will:
                                </Text>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-300">
                                    <li>Permanently remove the recipe from your account</li>
                                    <li>Delete the recipe image if one exists</li>
                                    {recipeStats?.is_public && recipeStats.favorite_count > 0 && (
                                        <li className="font-semibold">
                                            Remove access for {recipeStats.favorite_count} {recipeStats.favorite_count === 1 ? "user who has" : "users who have"} favorited this recipe
                                        </li>
                                    )}
                                    {recipeStats?.is_public && recipeStats.favorite_count === 0 && (
                                        <li>Remove this recipe from public view (no users have favorited it)</li>
                                    )}
                                </ul>
                            </div>

                            <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                                If this is a public recipe that others have favorited, they will lose access to it once deleted.
                            </Text>
                        </DialogBody>
                        <DialogActions>
                            <Button
                                type="button"
                                plain
                                onClick={() => {
                                    setShowDeleteDialog(false);
                                }}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                color="red"
                                onClick={handleDeleteRecipe}
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete Recipe"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
            </div>
        </SidebarLayout>
    );
};

export default CreateRecipe;