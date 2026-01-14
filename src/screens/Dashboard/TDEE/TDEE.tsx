import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { Field, Label } from "@components/fieldset";
import { FormAlert } from "@components/form-alert";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { AlertCircle, Target } from "lucide-react";

interface TDEEData {
    id: number;
    age: number;
    gender: "male" | "female";
    height_cm: number;
    activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
    bmr: number;
    tdee: number;
    created_at: string;
    updated_at: string;
}

interface WeightData {
    weight: number;
    unit: "kg" | "lbs";
}

interface User {
    id: number;
    email: string;
    full_name: string;
    subscribed: boolean;
}

interface Preferences {
    quick_add_days: number;
    weight_goal: "lose" | "maintain" | "gain" | null;
    target_weight: number | null;
    target_weight_unit: "kg" | "lbs" | null;
}

const TDEE: React.FC = () => {
    const loaderData = useLoaderData() as {
        title: string;
        meta: unknown[];
        user?: User;
        hasWeight: boolean;
        weightData?: WeightData | null;
        tdeeData?: TDEEData | null;
        preferences?: Preferences | null;
    };
    const helmet = useHelmet();
    const navigate = useNavigate();

    // Check if user is Pro
    const isProUser = loaderData.user?.subscribed === true;

    const [age, setAge] = useState<string>(loaderData.tdeeData?.age.toString() || "");
    const [gender, setGender] = useState<"male" | "female">(loaderData.tdeeData?.gender || "male");
    const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(loaderData.tdeeData ? "cm" : "cm");
    const [heightCm, setHeightCm] = useState<string>(loaderData.tdeeData?.height_cm.toString() || "");
    const [heightFeet, setHeightFeet] = useState<string>("");
    const [heightInches, setHeightInches] = useState<string>("");
    const [activityLevel, setActivityLevel] = useState<"sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active">(
        loaderData.tdeeData?.activity_level || "sedentary"
    );
    const [tdeeResult, setTdeeResult] = useState<TDEEData | null>(loaderData.tdeeData || null);
    const [currentWeight, setCurrentWeight] = useState<WeightData | null>(loaderData.weightData || null);
    const [hasWeight, setHasWeight] = useState<boolean>(loaderData.hasWeight);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const previousWeightRef = useRef<WeightData | null>(loaderData.weightData || null);

    // Pro feature: Weight goal states
    const [weightGoal, setWeightGoal] = useState<"lose" | "maintain" | "gain" | "">(
        loaderData.preferences?.weight_goal || ""
    );
    // Convert target weight to current user's unit if different from stored unit
    const getInitialTargetWeight = (): string => {
        const storedWeight = loaderData.preferences?.target_weight;
        if (storedWeight === null || storedWeight === undefined) return "";
        
        const storedUnit = loaderData.preferences?.target_weight_unit;
        const currentUnit = loaderData.weightData?.unit;
        
        // If units match or no conversion needed, return as-is
        if (!storedUnit || !currentUnit || storedUnit === currentUnit) {
            return storedWeight.toString();
        }
        
        // Convert between units
        if (storedUnit === "lbs" && currentUnit === "kg") {
            return (Math.round(storedWeight * 0.453592 * 10) / 10).toString();
        } else if (storedUnit === "kg" && currentUnit === "lbs") {
            return (Math.round(storedWeight * 2.20462 * 10) / 10).toString();
        }
        
        return storedWeight.toString();
    };
    const [targetWeight, setTargetWeight] = useState<string>(getInitialTargetWeight());
    const [isSavingGoal, setIsSavingGoal] = useState(false);
    const [goalError, setGoalError] = useState<string | null>(null);
    const [goalSuccess, setGoalSuccess] = useState<string | null>(null);

    // Convert height from feet/inches to cm when unit changes or values change
    useEffect(() => {
        if (heightUnit === "ft" && heightFeet && heightInches) {
            const feet = parseFloat(heightFeet);
            const inches = parseFloat(heightInches);
            if (!isNaN(feet) && !isNaN(inches)) {
                const totalInches = feet * 12 + inches;
                const cm = totalInches * 2.54;
                setHeightCm(cm.toFixed(2));
            }
        } else if (heightUnit === "cm" && loaderData.tdeeData) {
            // If we have existing data in cm, keep it
            setHeightCm(loaderData.tdeeData.height_cm.toString());
        }
    }, [heightUnit, heightFeet, heightInches, loaderData.tdeeData]);

    // Convert existing cm height to feet/inches when switching to ft unit
    useEffect(() => {
        if (heightUnit === "ft" && heightCm && !heightFeet && !heightInches) {
            const cm = parseFloat(heightCm);
            if (!isNaN(cm)) {
                const totalInches = cm / 2.54;
                const feet = Math.floor(totalInches / 12);
                const inches = Math.round(totalInches % 12);
                setHeightFeet(feet.toString());
                setHeightInches(inches.toString());
            }
        }
    }, [heightUnit, heightCm, heightFeet, heightInches]);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Check for weight changes and handle TDEE accordingly
    useEffect(() => {
        const checkWeight = async () => {
            try {
                const response = await fetch("/api/tdee/latest-weight", {
                    credentials: "include"
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.weight) {
                        const previousWeight = previousWeightRef.current;
                        const weightChanged = 
                            !previousWeight || 
                            previousWeight.weight !== data.weight.weight || 
                            previousWeight.unit !== data.weight.unit;
                        
                        previousWeightRef.current = data.weight;
                        setCurrentWeight(data.weight);
                        setHasWeight(true);
                        
                        // If weight changed and we have TDEE data, recalculate automatically
                        if (weightChanged && tdeeResult && age && heightCm) {
                            const heightCmValue = parseFloat(heightCm);
                            if (!isNaN(heightCmValue) && parseInt(age)) {
                                setIsLoading(true);
                                try {
                                    const recalcResponse = await fetch("/api/tdee", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json"
                                        },
                                        credentials: "include",
                                        body: JSON.stringify({
                                            age: parseInt(age),
                                            gender,
                                            heightCm: heightCmValue,
                                            activityLevel
                                        })
                                    });

                                    const recalcData = await recalcResponse.json();
                                    if (recalcResponse.ok && recalcData.tdee) {
                                        setTdeeResult(recalcData.tdee);
                                        setError(null);
                                    }
                                } catch (err) {
                                    console.error("Error recalculating TDEE:", err);
                                } finally {
                                    setIsLoading(false);
                                }
                            }
                        }
                    } else {
                        // Weight was deleted - reset TDEE if it exists
                        previousWeightRef.current = null;
                        setCurrentWeight(null);
                        setHasWeight(false);
                        if (tdeeResult) {
                            setTdeeResult(null);
                        }
                    }
                }
            } catch (err) {
                console.error("Error checking weight:", err);
            }
        };

        // Check weight periodically (every 30 seconds)
        const interval = setInterval(checkWeight, 30000);
        
        // Also check on mount
        checkWeight();

        return () => clearInterval(interval);
    }, [tdeeResult, age, heightCm, gender, activityLevel]);

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        // Validate age
        const ageValue = parseInt(age);
        if (!age || isNaN(ageValue) || ageValue < 1 || ageValue > 150) {
            errors.age = "Age must be a valid number between 1 and 150";
        }

        // Validate height
        if (heightUnit === "cm") {
            const cmValue = parseFloat(heightCm);
            if (!heightCm || isNaN(cmValue) || cmValue <= 0 || cmValue > 300) {
                errors.height = "Height must be a valid positive number (in cm)";
            }
        } else {
            const feetValue = parseFloat(heightFeet);
            const inchesValue = parseFloat(heightInches);
            if (!heightFeet || isNaN(feetValue) || feetValue < 0 || feetValue > 10) {
                errors.heightFeet = "Feet must be a valid number between 0 and 10";
            }
            if (!heightInches || isNaN(inchesValue) || inchesValue < 0 || inchesValue >= 12) {
                errors.heightInches = "Inches must be a valid number between 0 and 11";
            }
            if (feetValue === 0 && inchesValue === 0) {
                errors.height = "Height must be greater than 0";
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) {
            return;
        }

        // Convert height to cm if needed
        let heightCmValue: number;
        if (heightUnit === "cm") {
            heightCmValue = parseFloat(heightCm);
        } else {
            const feet = parseFloat(heightFeet);
            const inches = parseFloat(heightInches);
            const totalInches = feet * 12 + inches;
            heightCmValue = totalInches * 2.54;
        }

        setIsLoading(true);
        try {
            const response = await fetch("/api/tdee", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    age: parseInt(age),
                    gender,
                    heightCm: heightCmValue,
                    activityLevel
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to calculate TDEE");
                return;
            }

            setTdeeResult(data.tdee);
            setError(null);
        } catch (err) {
            console.error("Error saving TDEE:", err);
            setError("An error occurred while calculating TDEE. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const activityLevelLabels: Record<string, string> = {
        sedentary: "Sedentary (little or no exercise)",
        lightly_active: "Lightly Active (light exercise 1-3 days/week)",
        moderately_active: "Moderately Active (moderate exercise 3-5 days/week)",
        very_active: "Very Active (hard exercise 6-7 days/week)",
        extremely_active: "Extremely Active (very hard exercise, physical job)"
    };

    const weightGoalLabels: Record<string, string> = {
        lose: "Lose Weight",
        maintain: "Maintain Weight",
        gain: "Gain Weight"
    };

    // Pro feature: Save weight goal
    const handleSaveGoal = async () => {
        if (!isProUser) return;

        setGoalError(null);
        setGoalSuccess(null);

        if (!weightGoal) {
            setGoalError("Please select a weight goal");
            return;
        }

        // Validate target weight if provided
        if (targetWeight) {
            const weight = parseFloat(targetWeight);
            if (isNaN(weight) || weight <= 0) {
                setGoalError("Please enter a valid target weight");
                return;
            }
        }

        setIsSavingGoal(true);
        try {
            const response = await fetch("/api/settings/preferences", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    weight_goal: weightGoal,
                    target_weight: targetWeight ? parseFloat(targetWeight) : null,
                    target_weight_unit: targetWeight ? currentWeight?.unit : null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setGoalError(data.error || "Failed to save weight goal");
                return;
            }

            setGoalSuccess("Weight goal saved successfully!");
            setTimeout(() => setGoalSuccess(null), 3000);
        } catch (err) {
            console.error("Error saving weight goal:", err);
            setGoalError("An error occurred while saving your goal. Please try again.");
        } finally {
            setIsSavingGoal(false);
        }
    };

    // Pro feature: Clear weight goal
    const handleClearGoal = async () => {
        if (!isProUser) return;

        setGoalError(null);
        setGoalSuccess(null);
        setIsSavingGoal(true);

        try {
            const response = await fetch("/api/settings/preferences", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    weight_goal: null,
                    target_weight: null,
                    target_weight_unit: null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setGoalError(data.error || "Failed to clear weight goal");
                return;
            }

            setWeightGoal("");
            setTargetWeight("");
            setGoalSuccess("Weight goal cleared!");
            setTimeout(() => setGoalSuccess(null), 3000);
        } catch (err) {
            console.error("Error clearing weight goal:", err);
            setGoalError("An error occurred while clearing your goal. Please try again.");
        } finally {
            setIsSavingGoal(false);
        }
    };

    return (
        <SidebarLayout
            sidebar={<DashboardSidebar currentPath="/dashboard/tdee" />}
            navbar={
                <Navbar>
                    <NavbarSection>
                        <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    </NavbarSection>
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
        >
            <div className="space-y-6">
                <div>
                    <Heading level={1}>TDEE Calculator</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Calculate your Total Daily Energy Expenditure (TDEE) to understand how many calories you burn per day.
                    </Text>
                </div>

                {!hasWeight && (
                    <FormAlert variant="error">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 size-5 shrink-0" />
                            <div>
                                <p className="font-semibold">Weight data required</p>
                                <p className="mt-1 text-sm">
                                    You need to log your weight at least once in{" "}
                                    <button
                                        type="button"
                                        onClick={() => navigate("/dashboard/progress-tracking")}
                                        className="underline hover:text-zinc-950 dark:hover:text-white"
                                    >
                                        Progress Tracking
                                    </button>{" "}
                                    before calculating your TDEE.
                                </p>
                            </div>
                        </div>
                    </FormAlert>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field>
                            <Label>Age</Label>
                            <Input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                min="1"
                                max="150"
                                required
                                data-invalid={validationErrors.age ? true : undefined}
                            />
                            {validationErrors.age && (
                                <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    {validationErrors.age}
                                </Text>
                            )}
                        </Field>

                        <Field>
                            <Label>Gender</Label>
                            <Select
                                value={gender}
                                onChange={(e) => setGender(e.target.value as "male" | "female")}
                                required
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </Select>
                        </Field>
                    </div>

                    <Field>
                        <Label>Height</Label>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={() => setHeightUnit("cm")}
                                    className={heightUnit === "cm" ? "" : "bg-zinc-200 dark:bg-zinc-800"}
                                >
                                    Centimeters (cm)
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setHeightUnit("ft")}
                                    className={heightUnit === "ft" ? "" : "bg-zinc-200 dark:bg-zinc-800"}
                                >
                                    Feet & Inches
                                </Button>
                            </div>

                            {heightUnit === "cm" ? (
                                <div>
                                    <Input
                                        type="number"
                                        value={heightCm}
                                        onChange={(e) => setHeightCm(e.target.value)}
                                        placeholder="Height in cm"
                                        min="1"
                                        max="300"
                                        step="0.01"
                                        required
                                        data-invalid={validationErrors.height ? true : undefined}
                                    />
                                    {validationErrors.height && (
                                        <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                                            {validationErrors.height}
                                        </Text>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Input
                                            type="number"
                                            value={heightFeet}
                                            onChange={(e) => setHeightFeet(e.target.value)}
                                            placeholder="Feet"
                                            min="0"
                                            max="10"
                                            required
                                            data-invalid={validationErrors.heightFeet ? true : undefined}
                                        />
                                        {validationErrors.heightFeet && (
                                            <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                                                {validationErrors.heightFeet}
                                            </Text>
                                        )}
                                    </div>
                                    <div>
                                        <Input
                                            type="number"
                                            value={heightInches}
                                            onChange={(e) => setHeightInches(e.target.value)}
                                            placeholder="Inches"
                                            min="0"
                                            max="11"
                                            required
                                            data-invalid={validationErrors.heightInches ? true : undefined}
                                        />
                                        {validationErrors.heightInches && (
                                            <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                                                {validationErrors.heightInches}
                                            </Text>
                                        )}
                                    </div>
                                    {validationErrors.height && (
                                        <Text className="col-span-2 mt-1 text-sm text-red-600 dark:text-red-400">
                                            {validationErrors.height}
                                        </Text>
                                    )}
                                </div>
                            )}
                        </div>
                    </Field>

                    <Field>
                        <Label>Activity Level</Label>
                        <Select
                            value={activityLevel}
                            onChange={(e) => setActivityLevel(e.target.value as typeof activityLevel)}
                            required
                        >
                            {Object.entries(activityLevelLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </Field>

                    <div className="flex gap-4">
                        <Button type="submit" disabled={isLoading || !hasWeight}>
                            Save
                        </Button>
                    </div>
                        </form>
                    </div>

                    <div className="space-y-6 lg:col-span-1">
                        {hasWeight && currentWeight && (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <Text className="text-sm">
                                    <strong>Current Weight:</strong> {currentWeight.weight} {currentWeight.unit}
                                </Text>
                                <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                    Using your most recent weight entry from Progress Tracking
                                </Text>
                            </div>
                        )}

                        {tdeeResult && (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                                <Heading level={2} className="mb-4">
                                    Your TDEE Results
                                </Heading>
                                <div className="space-y-4">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">BMR (Basal Metabolic Rate)</Text>
                                        <Text className="text-2xl font-bold">{Math.round(tdeeResult.bmr)} calories/day</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">TDEE (Total Daily Energy Expenditure)</Text>
                                        <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {Math.round(tdeeResult.tdee)} calories/day
                                        </Text>
                                    </div>
                                </div>
                                <Text className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                                    Your TDEE represents the total number of calories you burn per day, including your BMR and activity level.
                                    Use this as a baseline for your daily calorie goals.
                                </Text>
                            </div>
                        )}

                        {/* Pro Feature: Weight Goal */}
                        {isProUser && tdeeResult && (
                            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="flex items-center gap-2 mb-4">
                                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <Heading level={2}>
                                        Weight Goal
                                    </Heading>
                                </div>
                                <Text className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                                    Set your weight goal to get personalized macro recommendations and progress tracking on your dashboard.
                                </Text>
                                <div className="space-y-4">
                                    <Field>
                                        <Label>Objective</Label>
                                        <Select
                                            value={weightGoal}
                                            onChange={(e) => setWeightGoal(e.target.value as "lose" | "maintain" | "gain" | "")}
                                        >
                                            <option value="">Select your goal...</option>
                                            {Object.entries(weightGoalLabels).map(([value, label]) => (
                                                <option key={value} value={value}>
                                                    {label}
                                                </option>
                                            ))}
                                        </Select>
                                    </Field>

                                    {weightGoal && weightGoal !== "maintain" && currentWeight && (
                                        <Field>
                                            <Label>Target Weight ({currentWeight.unit})</Label>
                                            <Input
                                                type="number"
                                                value={targetWeight}
                                                onChange={(e) => setTargetWeight(e.target.value)}
                                                placeholder={`Target weight in ${currentWeight.unit}`}
                                                min="1"
                                                step="0.1"
                                            />
                                            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                Optional: Set a target to see projected timeline on your dashboard.
                                            </Text>
                                        </Field>
                                    )}

                                    {goalError && (
                                        <Text className="text-sm text-red-600 dark:text-red-400">{goalError}</Text>
                                    )}
                                    {goalSuccess && (
                                        <Text className="text-sm text-green-600 dark:text-green-400">{goalSuccess}</Text>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={handleSaveGoal}
                                            disabled={isSavingGoal || !weightGoal}
                                        >
                                            {isSavingGoal ? "Saving..." : "Save Goal"}
                                        </Button>
                                        {(loaderData.preferences?.weight_goal || weightGoal) && (
                                            <Button
                                                type="button"
                                                onClick={handleClearGoal}
                                                disabled={isSavingGoal}
                                                outline
                                            >
                                                Clear Goal
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <FormAlert variant="error">{error}</FormAlert>
                )}
            </div>
        </SidebarLayout>
    );
};

export default TDEE;
