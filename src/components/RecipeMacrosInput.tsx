import React, { useState } from "react";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Input } from "@components/input";
import { Field, Label as FieldLabel, Description } from "@components/fieldset";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface RecipeMacros {
    // Core Macros
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    
    // Commonly Tracked Sub-Macros
    fiber?: number;
    sugars?: number;
    net_carbs?: number;
    
    // Performance & Optimization
    saturated_fat?: number;
    unsaturated_fat?: number;
    polyunsaturated_fat?: number;
    monounsaturated_fat?: number;
    cholesterol?: number;
    sodium?: number;
    potassium?: number;
    protein_distribution_per_meal?: number;
}

interface RecipeMacrosInputProps {
    macros: RecipeMacros;
    onChange: (macros: RecipeMacros) => void;
}

const MACRO_CATEGORIES = [
    {
        title: "Core Macros",
        macros: [
            { key: "calories", label: "Calories", unit: "kcal", placeholder: "e.g., 250" },
            { key: "protein", label: "Protein", unit: "g", placeholder: "e.g., 20" },
            { key: "carbohydrates", label: "Carbohydrates", unit: "g", placeholder: "e.g., 30" },
            { key: "fat", label: "Fat (Lipids)", unit: "g", placeholder: "e.g., 10" }
        ]
    },
    {
        title: "Commonly Tracked Sub-Macros",
        macros: [
            { key: "fiber", label: "Fiber", unit: "g", placeholder: "e.g., 5" },
            { key: "sugars", label: "Sugars", unit: "g", placeholder: "e.g., 10" },
            { key: "net_carbs", label: "Net Carbs", unit: "g", placeholder: "e.g., 25" }
        ]
    },
    {
        title: "Performance & Optimization",
        macros: [
            { key: "saturated_fat", label: "Saturated Fat", unit: "g", placeholder: "e.g., 3" },
            { key: "unsaturated_fat", label: "Unsaturated Fat", unit: "g", placeholder: "e.g., 5" },
            { key: "polyunsaturated_fat", label: "Polyunsaturated Fat", unit: "g", placeholder: "e.g., 2" },
            { key: "monounsaturated_fat", label: "Monounsaturated Fat", unit: "g", placeholder: "e.g., 3" },
            { key: "cholesterol", label: "Cholesterol", unit: "mg", placeholder: "e.g., 50" },
            { key: "sodium", label: "Sodium", unit: "mg", placeholder: "e.g., 500" },
            { key: "potassium", label: "Potassium", unit: "mg", placeholder: "e.g., 200" },
            { key: "protein_distribution_per_meal", label: "Protein Distribution per Meal", unit: "g", placeholder: "e.g., 25" }
        ]
    }
];

const RecipeMacrosInput: React.FC<RecipeMacrosInputProps> = ({ macros, onChange }) => {
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        "Core Macros": true,
        "Commonly Tracked Sub-Macros": false,
        "Performance & Optimization": false
    });

    const toggleCategory = (categoryTitle: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryTitle]: !prev[categoryTitle]
        }));
    };

    const handleMacroChange = (key: keyof RecipeMacros, value: string) => {
        const numValue = value === "" ? undefined : parseFloat(value);
        onChange({
            ...macros,
            [key]: numValue !== undefined && !isNaN(numValue) ? numValue : undefined
        });
    };

    const hasAnyMacros = Object.values(macros).some(val => val !== undefined && val !== null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <Heading level={3} className="text-base">Nutritional Information (Optional)</Heading>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Provide macros per portion. Select which values you want to include.
                    </Text>
                </div>
            </div>

            {MACRO_CATEGORIES.map((category) => {
                const isExpanded = expandedCategories[category.title];
                const categoryHasValues = category.macros.some(
                    macro => macros[macro.key as keyof RecipeMacros] !== undefined
                );

                return (
                    <div key={category.title} className="border border-zinc-950/10 rounded-lg dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => toggleCategory(category.title)}
                            className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors rounded-t-lg"
                        >
                            <Heading level={4} className="text-sm font-medium">
                                {category.title}
                            </Heading>
                            <div className="flex items-center gap-2">
                                {categoryHasValues && (
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
                            <div className="p-4 space-y-4 border-t border-zinc-950/10 dark:border-white/10">
                                {category.macros.map((macro) => {
                                    const key = macro.key as keyof RecipeMacros;
                                    const value = macros[key];
                                    
                                    return (
                                        <Field key={macro.key}>
                                            <FieldLabel>{macro.label}</FieldLabel>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={value !== undefined ? value.toString() : ""}
                                                    onChange={(e) => handleMacroChange(key, e.target.value)}
                                                    placeholder={macro.placeholder}
                                                    className="flex-1"
                                                />
                                                <Text className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                                    {macro.unit}
                                                </Text>
                                            </div>
                                        </Field>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}

            {hasAnyMacros && (
                <div className="rounded-lg border border-blue-500/20 bg-blue-50 p-3 dark:bg-blue-950/10">
                    <Text className="text-sm text-blue-800 dark:text-blue-200">
                        💡 Tip: All values are per portion. Make sure to specify portion size in your recipe description if needed.
                    </Text>
                </div>
            )}
        </div>
    );
};

export default RecipeMacrosInput;
