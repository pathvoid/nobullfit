import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
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
import { ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Scale, MoreVertical, Copy, ClipboardPaste, Calendar, Crown, ChevronDown } from "lucide-react";
import { ActivityType, ACTIVITY_TYPES, getActivityTypeConfig, type ActivityTypeConfig } from "@utils/activityTypes";
import { formatFieldValue } from "@utils/activityFormatters";
import { toast } from "sonner";

interface LoggedActivity {
    id: number;
    activity_type: ActivityType;
    activity_name: string;
    date: string;
    timezone: string;
    activity_data: Record<string, unknown>;
    calories_burned?: number | null;
    created_at: string;
    updated_at: string;
}

interface RecentActivity {
    activity_type: ActivityType;
    activity_name: string;
    activity_data: Record<string, unknown>;
    calories_burned?: number | null;
}

interface WeightEntry {
    id: number;
    weight: number;
    unit: "kg" | "lbs";
    date: string;
    timezone: string;
    created_at: string;
    updated_at: string;
}

interface User {
    id: number;
    email: string;
    full_name: string;
    subscribed: boolean;
}

// Format date for display
function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

// Format date for API (YYYY-MM-DD)
function formatDateForAPI(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// Parse time string (HH:MM:SS or MM:SS) to seconds
function parseTimeToSeconds(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

// Format seconds to time string (HH:MM:SS)
function formatSecondsToTime(seconds: number): string {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
}

const ProgressTracking: React.FC = () => {
    const loaderData = useLoaderData() as {
        title: string;
        meta: unknown[];
        user?: User;
        initialActivities?: LoggedActivity[];
        initialDate?: string | null;
        initialTimezone?: string | null;
    };
    const helmet = useHelmet();

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

    const [activities, setActivities] = useState<LoggedActivity[]>(loaderData.initialActivities || []);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Weight tracking state
    const [weightEntry, setWeightEntry] = useState<WeightEntry | null>(null);
    const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
    const [weightValue, setWeightValue] = useState("");
    const [isLoadingWeight, setIsLoadingWeight] = useState(false);
    const [isSavingWeight, setIsSavingWeight] = useState(false);
    const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    // Copy day state (Pro feature)
    const [copiedDate, setCopiedDate] = useState<string | null>(null);
    const [isPasting, setIsPasting] = useState(false);
    
    // Copy week dialog state (Pro feature)
    const [isCopyWeekDialogOpen, setIsCopyWeekDialogOpen] = useState(false);
    const [copyWeekSourceStart, setCopyWeekSourceStart] = useState("");
    const [copyWeekTargetStart, setCopyWeekTargetStart] = useState("");
    const [isCopyingWeek, setIsCopyingWeek] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<LoggedActivity | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Add activity form state
    const [selectedActivityType, setSelectedActivityType] = useState<ActivityType>("running");
    const [activityName, setActivityName] = useState("");
    const [activityFormData, setActivityFormData] = useState<Record<string, string>>({});
    const [useQuickAdd, setUseQuickAdd] = useState(false);
    const [quickAddActivity, setQuickAddActivity] = useState<RecentActivity | null>(null);

    // Edit activity form state
    const [editingActivity, setEditingActivity] = useState<LoggedActivity | null>(null);
    const [editActivityName, setEditActivityName] = useState("");
    const [editActivityFormData, setEditActivityFormData] = useState<Record<string, string>>({});

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Fetch activities for the current date
    const fetchActivities = useCallback(async (date: Date) => {
        setIsLoading(true);
        try {
            const dateStr = formatDateForAPI(date);
            const response = await fetch(`/api/progress-tracking?date=${dateStr}&timezone=${encodeURIComponent(userTimezone)}`, {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setActivities(data.activities || []);
            }
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userTimezone]);

    // Fetch recent activities for quick-add
    const fetchRecentActivities = useCallback(async () => {
        try {
            const response = await fetch("/api/progress-tracking/recent", {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setRecentActivities(data.activities || []);
            }
        } catch (error) {
            console.error("Error fetching recent activities:", error);
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

    // Fetch weight for current date
    const fetchWeight = useCallback(async (date: Date) => {
        setIsLoadingWeight(true);
        try {
            const dateStr = formatDateForAPI(date);
            const response = await fetch(`/api/weight-tracking?date=${dateStr}`, {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                if (data.weight) {
                    setWeightEntry(data.weight);
                    setWeightValue(data.weight.weight.toString());
                    setWeightUnit(data.weight.unit);
                } else {
                    setWeightEntry(null);
                    setWeightValue("");
                }
            }
        } catch (error) {
            console.error("Error fetching weight:", error);
        } finally {
            setIsLoadingWeight(false);
        }
    }, []);

    // Fetch last unit preference (only if no weight entry exists)
    const fetchLastWeightUnit = useCallback(async () => {
        try {
            const response = await fetch("/api/weight-tracking/last-unit", {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                // Only set unit if we don't have a weight entry (to avoid overriding existing entry's unit)
                if (!weightEntry) {
                    setWeightUnit(data.unit || "kg");
                }
            }
        } catch (error) {
            console.error("Error fetching last weight unit:", error);
        }
    }, [weightEntry]);

    // Open weight dialog and load current weight if exists
    const handleOpenWeightDialog = () => {
        if (weightEntry) {
            setWeightValue(weightEntry.weight.toString());
            setWeightUnit(weightEntry.unit);
        } else {
            setWeightValue("");
        }
        setIsWeightDialogOpen(true);
    };

    // Save weight
    const handleSaveWeight = async () => {
        if (!weightValue || parseFloat(weightValue) <= 0) return;

        setIsSavingWeight(true);
        try {
            const dateStr = formatDateForAPI(currentDate);
            const response = await fetch("/api/weight-tracking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    weight: parseFloat(weightValue),
                    unit: weightUnit,
                    date: dateStr,
                    timezone: userTimezone
                })
            });

            if (response.ok) {
                setIsWeightDialogOpen(false);
                await fetchWeight(currentDate);
                const wasUpdate = weightEntry !== null;
                setWeightValue("");
                toast.success(wasUpdate ? "Weight updated successfully!" : "Weight saved successfully!");
            }
        } catch (error) {
            console.error("Error saving weight:", error);
            toast.error("Failed to save weight. Please try again.");
        } finally {
            setIsSavingWeight(false);
        }
    };

    // Delete weight
    const handleDeleteWeight = async () => {
        if (!weightEntry) return;

        setIsSavingWeight(true);
        try {
            const response = await fetch(`/api/weight-tracking/${weightEntry.id}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                setWeightEntry(null);
                setWeightValue("");
                toast.success("Weight deleted successfully!");
            }
        } catch (error) {
            console.error("Error deleting weight:", error);
            toast.error("Failed to delete weight. Please try again.");
        } finally {
            setIsSavingWeight(false);
        }
    };

    // Load activities when date changes
    useEffect(() => {
        fetchActivities(currentDate);
    }, [currentDate, fetchActivities]);

    // Load recent activities on mount
    useEffect(() => {
        fetchRecentActivities();
    }, [fetchRecentActivities]);

    // Load weight when date changes
    useEffect(() => {
        fetchWeight(currentDate);
    }, [currentDate, fetchWeight]);

    // Load last unit preference on mount (only if no weight entry)
    useEffect(() => {
        if (!weightEntry) {
            fetchLastWeightUnit();
        }
    }, [weightEntry, fetchLastWeightUnit]);

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
            const response = await fetch("/api/progress-tracking/copy-day", {
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
                await fetchActivities(currentDate);
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
            const response = await fetch("/api/progress-tracking/copy-week", {
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
                await fetchActivities(currentDate);
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

    // Reset add dialog form state
    const resetAddDialog = () => {
        setSelectedActivityType("running");
        setActivityName("");
        setActivityFormData({});
        setUseQuickAdd(false);
        setQuickAddActivity(null);
    };

    // Handle activity type change
    const handleActivityTypeChange = (type: ActivityType) => {
        setSelectedActivityType(type);
        setActivityName("");
        setActivityFormData({});
        setUseQuickAdd(false);
        setQuickAddActivity(null);
    };

    // Handle quick-add selection
    const handleQuickAddSelect = (activity: RecentActivity) => {
        setQuickAddActivity(activity);
        setSelectedActivityType(activity.activity_type);
        setActivityName(activity.activity_name);
        
        // Convert activity data to form data (including calories_burned) with proper formatting
        const config = getActivityTypeConfig(activity.activity_type);
        const formData: Record<string, string> = {};
        Object.keys(activity.activity_data || {}).forEach((key) => {
            const value = activity.activity_data[key];
            if (value !== null && value !== undefined) {
                const field = config?.fields.find(f => f.key === key);
                if (field && (typeof value === "string" || typeof value === "number")) {
                    formData[key] = formatFieldValue(value, field.type, field.key);
                } else {
                    formData[key] = String(value);
                }
            }
        });
        if (activity.calories_burned !== null && activity.calories_burned !== undefined) {
            formData.calories_burned = formatFieldValue(activity.calories_burned, "number", "calories_burned");
        }
        
        setActivityFormData(formData);
        setUseQuickAdd(true);
    };

    // Handle add activity
    const handleAddActivity = async () => {
        if (!activityName.trim()) return;

        setIsSaving(true);
        try {
            const config = getActivityTypeConfig(selectedActivityType);
            if (!config) return;

            // Build activity data from form with proper formatting
            const activityData: Record<string, unknown> = {};
            config.fields.forEach((field) => {
                if (field.key !== "calories_burned" && activityFormData[field.key]) {
                    const value = activityFormData[field.key];
                    // Format the value before storing
                    const formattedValue = formatFieldValue(value, field.type, field.key);
                    if (formattedValue) {
                        if (field.type === "number") {
                            activityData[field.key] = parseFloat(formattedValue) || null;
                        } else {
                            activityData[field.key] = formattedValue || null;
                        }
                    }
                }
            });

            const caloriesBurned = activityFormData.calories_burned 
                ? parseFloat(formatFieldValue(activityFormData.calories_burned, "number", "calories_burned")) || null
                : null;

            const dateStr = formatDateForAPI(currentDate);

            const response = await fetch("/api/progress-tracking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    activityType: selectedActivityType,
                    activityName: activityName.trim(),
                    date: dateStr,
                    timezone: userTimezone,
                    activityData: activityData,
                    caloriesBurned: caloriesBurned
                })
            });

            if (response.ok) {
                setIsAddDialogOpen(false);
                resetAddDialog();
                await fetchActivities(currentDate);
                await fetchRecentActivities();
                toast.success("Activity added successfully!");
            }
        } catch (error) {
            console.error("Error adding activity:", error);
            toast.error("Failed to add activity. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Handle edit activity
    const handleEditActivity = (activity: LoggedActivity) => {
        setEditingActivity(activity);
        setEditActivityName(activity.activity_name);
        
        // Convert activity data to form data with proper formatting
        const config = getActivityTypeConfig(activity.activity_type);
        const formData: Record<string, string> = {};
        Object.keys(activity.activity_data).forEach((key) => {
            const value = activity.activity_data[key];
            if (value !== null && value !== undefined) {
                const field = config?.fields.find(f => f.key === key);
                if (field && (typeof value === "string" || typeof value === "number")) {
                    formData[key] = formatFieldValue(value, field.type, field.key);
                } else {
                    formData[key] = String(value);
                }
            }
        });
        if (activity.calories_burned !== null && activity.calories_burned !== undefined) {
            formData.calories_burned = formatFieldValue(activity.calories_burned, "number", "calories_burned");
        }
        setEditActivityFormData(formData);
        setIsEditDialogOpen(true);
    };

    // Handle save edit
    const handleSaveEdit = async () => {
        if (!editingActivity || !editActivityName.trim()) return;

        setIsSaving(true);
        try {
            const config = getActivityTypeConfig(editingActivity.activity_type);
            if (!config) return;

            // Build activity data from form (exclude calories_burned as it's stored separately) with proper formatting
            const activityData: Record<string, unknown> = {};
            config.fields.forEach((field) => {
                if (field.key !== "calories_burned" && editActivityFormData[field.key]) {
                    const value = editActivityFormData[field.key];
                    if (value && value.trim() !== "") {
                        // Format the value before storing
                        const formattedValue = formatFieldValue(value, field.type, field.key);
                        if (formattedValue) {
                            if (field.type === "number") {
                                const numValue = parseFloat(formattedValue);
                                if (!isNaN(numValue)) {
                                    activityData[field.key] = numValue;
                                }
                            } else {
                                activityData[field.key] = formattedValue;
                            }
                        }
                    }
                }
            });

            const caloriesBurned = editActivityFormData.calories_burned && editActivityFormData.calories_burned.trim() !== "" 
                ? parseFloat(formatFieldValue(editActivityFormData.calories_burned, "number", "calories_burned")) || null
                : null;

            const response = await fetch(`/api/progress-tracking/${editingActivity.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    activityName: editActivityName.trim(),
                    activityData: activityData,
                    caloriesBurned: caloriesBurned
                })
            });

            if (response.ok) {
                setIsEditDialogOpen(false);
                setEditingActivity(null);
                await fetchActivities(currentDate);
                toast.success("Activity updated successfully!");
            }
        } catch (error) {
            console.error("Error updating activity:", error);
            toast.error("Failed to update activity. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Handle delete activity
    const handleDeleteActivity = (activity: LoggedActivity) => {
        setActivityToDelete(activity);
        setIsDeleteDialogOpen(true);
    };

    // Confirm and execute delete
    const handleConfirmDelete = async () => {
        if (!activityToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/progress-tracking/${activityToDelete.id}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                setIsDeleteDialogOpen(false);
                setActivityToDelete(null);
                await fetchActivities(currentDate);
                toast.success("Activity deleted successfully!");
            }
        } catch (error) {
            console.error("Error deleting activity:", error);
            toast.error("Failed to delete activity. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate total calories burned
    const totalCalories = activities.reduce((sum, activity) => {
        const calories = typeof activity.calories_burned === "number" ? activity.calories_burned : 0;
        return sum + calories;
    }, 0);

    // Render activity form fields
    const renderActivityFields = (config: ActivityTypeConfig, formData: Record<string, string>, setFormData: (data: Record<string, string>) => void, disabled = false) => {
        return config.fields.map((field) => {
            // Skip calories_burned in the main fields - it will be shown separately
            if (field.key === "calories_burned") {
                return null;
            }

            if (field.type === "time") {
                return (
                    <Field key={field.key}>
                        <FieldLabel>
                            {field.label}
                            {field.optional && <span className="text-zinc-500"> (optional)</span>}
                        </FieldLabel>
                        <Input
                            type="text"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            onBlur={(e) => {
                                const formatted = formatFieldValue(e.target.value, field.type, field.key);
                                setFormData({ ...formData, [field.key]: formatted });
                            }}
                            placeholder={field.placeholder || ""}
                            disabled={disabled}
                            pattern={field.key === "pace" ? "^([0-5]?[0-9]:)?[0-5][0-9](\\s*\\/\\s*km)?$" : "^([0-9]{1,2}:)?[0-5][0-9]:[0-5][0-9]$"}
                        />
                    </Field>
                );
            } else if (field.type === "number") {
                // Determine if decimals are allowed
                const integerFields = ["sets", "reps", "steps", "laps", "rounds"];
                const allowDecimals = !integerFields.includes(field.key);
                return (
                    <Field key={field.key}>
                        <FieldLabel>
                            {field.label}
                            {field.optional && <span className="text-zinc-500"> (optional)</span>}
                            {field.unit && <span className="text-zinc-500"> ({field.unit})</span>}
                        </FieldLabel>
                        <Input
                            type="number"
                            step={allowDecimals ? "0.01" : "1"}
                            min="0"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            onBlur={(e) => {
                                const formatted = formatFieldValue(e.target.value, field.type, field.key);
                                setFormData({ ...formData, [field.key]: formatted });
                            }}
                            placeholder={field.placeholder || ""}
                            disabled={disabled}
                        />
                    </Field>
                );
            } else {
                // Text fields (including pace)
                return (
                    <Field key={field.key}>
                        <FieldLabel>
                            {field.label}
                            {field.optional && <span className="text-zinc-500"> (optional)</span>}
                        </FieldLabel>
                        {field.key === "pace" && (
                            <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                Enter pace as MM:SS/km (e.g., 5:30/km), decimal minutes (e.g., 5.5), or total seconds (e.g., 330)
                            </Text>
                        )}
                        <Input
                            type="text"
                            value={formData[field.key] || ""}
                            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                            onBlur={(e) => {
                                const formatted = formatFieldValue(e.target.value, field.type, field.key);
                                setFormData({ ...formData, [field.key]: formatted });
                            }}
                            placeholder={field.placeholder || ""}
                            disabled={disabled}
                            pattern={field.key === "pace" ? undefined : undefined}
                        />
                    </Field>
                );
            }
        }).concat([
            // Always show calories_burned at the end
            <Field key="calories_burned">
                <FieldLabel>
                    Calories Burned <span className="text-zinc-500">(kcal)</span>
                </FieldLabel>
                <Input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.calories_burned || ""}
                    onChange={(e) => setFormData({ ...formData, calories_burned: e.target.value })}
                    onBlur={(e) => {
                        const formatted = formatFieldValue(e.target.value, "number", "calories_burned");
                        setFormData({ ...formData, calories_burned: formatted });
                    }}
                    placeholder="e.g., 300"
                    disabled={disabled}
                />
            </Field>
        ]);
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
            sidebar={<DashboardSidebar currentPath="/dashboard/progress-tracking" />}
        >
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <Heading level={1}>Progress Tracking</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Track your health and fitness progress over time.
                    </Text>
                    <Text className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {formatDate(currentDate)}
                    </Text>
                </div>

                {/* Date Navigation */}
                <div className="space-y-3">
                    {/* Date picker row - on desktop includes Today button and action buttons */}
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
                            title={!isProUser && !canNavigateToDate(new Date(currentDate.getTime() + 86400000)) ? "Pro feature: Log activities for future days" : "Next day"}
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
                        {/* For Pro users: Copy & Paste and action buttons on far right */}
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
                                                disabled={activities.length === 0}
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
                                <div className="hidden sm:flex sm:gap-2">
                                    <Button onClick={() => {
                                        resetAddDialog();
                                        setIsAddDialogOpen(true);
                                    }}>
                                        <Plus className="h-4 w-4" data-slot="icon" />
                                        Add Activity
                                    </Button>
                                    <Button onClick={handleOpenWeightDialog} outline>
                                        <Scale className="h-4 w-4" data-slot="icon" />
                                        {weightEntry ? "Update Weight" : "Add Weight"}
                                    </Button>
                                </div>
                            </>
                        )}
                        {/* For non-pro users: Action buttons on far right */}
                        {!isProUser && (
                            <div className="hidden sm:flex sm:gap-2">
                                <Button onClick={() => {
                                    resetAddDialog();
                                    setIsAddDialogOpen(true);
                                }}>
                                    <Plus className="h-4 w-4" data-slot="icon" />
                                    Add Activity
                                </Button>
                                <Button onClick={handleOpenWeightDialog} outline>
                                    <Scale className="h-4 w-4" data-slot="icon" />
                                    {weightEntry ? "Update Weight" : "Add Weight"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Daily Summary */}
                {(activities.length > 0 || weightEntry) && (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-6 dark:border-white/10 dark:bg-zinc-800/50">
                        <Heading level={2} className="mb-4 text-lg">
                            Daily Summary
                        </Heading>
                        <div className="flex flex-wrap items-center gap-6">
                            {weightEntry && (
                                <div>
                                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">Weight</Text>
                                    <Text className="text-xl font-semibold">{weightEntry.weight} {weightEntry.unit}</Text>
                                </div>
                            )}
                            {activities.length > 0 && (
                                <>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Calories Burned</Text>
                                        <Text className="text-xl font-semibold">{totalCalories.toFixed(0)} kcal</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Activities</Text>
                                        <Text className="text-xl font-semibold">{activities.length}</Text>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Activities List */}
                {isLoading ? (
                    <Text className="text-zinc-600 dark:text-zinc-400">Loading...</Text>
                ) : activities.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img 
                            src="https://cdn.nobull.fit/professor-pear.png" 
                            alt="No activities logged" 
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            No Activities Logged
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Click "Add Activity" to start tracking your workouts and activities!
                        </Text>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activities.map((activity) => {
                            const config = getActivityTypeConfig(activity.activity_type);
                            const activityData = activity.activity_data || {};

                            return (
                                <div
                                    key={activity.id}
                                    className="group rounded-lg border border-zinc-950/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-800/50"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Text className="font-medium">{activity.activity_name}</Text>
                                                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-400/10 dark:text-blue-400">
                                                    {config?.label || activity.activity_type}
                                                </span>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                {Object.keys(activityData).map((key) => {
                                                    const value = activityData[key];
                                                    if (value === null || value === undefined || value === "") return null;
                                                    
                                                    const field = config?.fields.find(f => f.key === key);
                                                    const label = field?.label || key;
                                                    const unit = field?.unit || "";
                                                    
                                                    return (
                                                        <Text key={key} className="text-sm text-zinc-600 dark:text-zinc-400">
                                                            {label}: {String(value)} {unit}
                                                        </Text>
                                                    );
                                                })}
                                                {activity.calories_burned !== null && activity.calories_burned !== undefined && (
                                                    <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                        Calories: {typeof activity.calories_burned === "number" ? activity.calories_burned.toFixed(0) : Number(activity.calories_burned).toFixed(0)} kcal
                                                    </Text>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Dropdown>
                                                <DropdownButton
                                                    plain
                                                    className="p-2"
                                                    aria-label="Activity options"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </DropdownButton>
                                                <DropdownMenu anchor="bottom end" className="min-w-40">
                                                    <DropdownItem
                                                        onClick={() => handleEditActivity(activity)}
                                                    >
                                                        <Pencil className="h-4 w-4" data-slot="icon" />
                                                        <DropdownLabel>Edit</DropdownLabel>
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        onClick={() => handleDeleteActivity(activity)}
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

            {/* Add Activity Dialog */}
            <Dialog open={isAddDialogOpen} onClose={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                    resetAddDialog();
                }
            }} size="xl">
                <DialogTitle>Add Activity</DialogTitle>
                <DialogDescription>
                    Log a new activity or exercise for {formatDate(currentDate)}.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-6">
                        {/* Quick Add Section */}
                        {recentActivities.length > 0 && (
                            <div className="border-b border-zinc-950/10 pb-6 dark:border-white/10">
                                <Field>
                                    <FieldLabel>Quick Add (Previously Logged)</FieldLabel>
                                    <Select
                                        value={quickAddActivity ? `${quickAddActivity.activity_type}:${quickAddActivity.activity_name}` : ""}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const [type, name] = e.target.value.split(":");
                                                const activity = recentActivities.find(
                                                    a => a.activity_type === type && a.activity_name === name
                                                );
                                                if (activity) {
                                                    handleQuickAddSelect(activity);
                                                }
                                            } else {
                                                setUseQuickAdd(false);
                                                setQuickAddActivity(null);
                                            }
                                        }}
                                        disabled={isSaving}
                                    >
                                        <option value="">Select a previous activity...</option>
                                        {recentActivities.map((activity, index) => (
                                            <option key={index} value={`${activity.activity_type}:${activity.activity_name}`}>
                                                {activity.activity_name} ({getActivityTypeConfig(activity.activity_type)?.label || activity.activity_type})
                                            </option>
                                        ))}
                                    </Select>
                                    <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                        Quickly re-add an activity you've logged before.
                                    </Text>
                                </Field>
                            </div>
                        )}

                        {/* Activity Type */}
                        <Field>
                            <FieldLabel>Activity Type</FieldLabel>
                            <Select
                                value={selectedActivityType}
                                onChange={(e) => handleActivityTypeChange(e.target.value as ActivityType)}
                                disabled={isSaving || useQuickAdd}
                            >
                                {ACTIVITY_TYPES.map((type) => (
                                    <option key={type.type} value={type.type}>
                                        {type.label}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        {/* Activity Name */}
                        <Field>
                            <FieldLabel>Activity Name</FieldLabel>
                            <Input
                                type="text"
                                value={activityName}
                                onChange={(e) => setActivityName(e.target.value)}
                                placeholder="e.g., Morning Run, Bench Press, Yoga Session"
                                disabled={isSaving}
                            />
                        </Field>

                        {/* Activity Fields */}
                        {(() => {
                            const config = getActivityTypeConfig(selectedActivityType);
                            if (!config) return null;
                            return (
                                <div className="space-y-4">
                                    {renderActivityFields(config, activityFormData, setActivityFormData, isSaving)}
                                </div>
                            );
                        })()}
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleAddActivity} disabled={isSaving || !activityName.trim()}>
                        {isSaving ? "Adding..." : "Add Activity"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Activity Dialog */}
            {editingActivity && (
                <Dialog open={isEditDialogOpen} onClose={setIsEditDialogOpen} size="xl">
                    <DialogTitle>Edit Activity</DialogTitle>
                    <DialogDescription>
                        Update the details for "{editingActivity.activity_name}".
                    </DialogDescription>
                    <DialogBody>
                        <div className="space-y-6">
                            <Field>
                                <FieldLabel>Activity Name</FieldLabel>
                                <Input
                                    type="text"
                                    value={editActivityName}
                                    onChange={(e) => setEditActivityName(e.target.value)}
                                    disabled={isSaving}
                                />
                            </Field>

                            {(() => {
                                const config = getActivityTypeConfig(editingActivity.activity_type);
                                if (!config) return null;
                                return (
                                    <div className="space-y-4">
                                        {renderActivityFields(config, editActivityFormData, setEditActivityFormData, isSaving)}
                                    </div>
                                );
                            })()}
                        </div>
                    </DialogBody>
                    <DialogActions>
                        <Button plain onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isSaving || !editActivityName.trim()}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onClose={setIsDeleteDialogOpen}>
                <DialogTitle>Delete Activity</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete "{activityToDelete?.activity_name}"? This action cannot be undone.
                </DialogDescription>
                <DialogBody>
                    <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                        This will permanently remove this activity from your progress tracking for this date.
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

            {/* Weight Dialog */}
            <Dialog open={isWeightDialogOpen} onClose={(open) => {
                setIsWeightDialogOpen(open);
                if (!open && !weightEntry) {
                    // Reset weight value if canceling and no existing entry
                    setWeightValue("");
                }
            }}>
                <DialogTitle>{weightEntry ? "Update Weight" : "Add Weight"}</DialogTitle>
                <DialogDescription>
                    Enter your weight for {formatDate(currentDate)}.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-4">
                        <Field>
                            <FieldLabel>Weight</FieldLabel>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={weightValue}
                                    onChange={(e) => setWeightValue(e.target.value)}
                                    placeholder={weightUnit === "kg" ? "e.g., 70.5" : "e.g., 155.5"}
                                    disabled={isSavingWeight}
                                    className="flex-[3] min-w-0"
                                />
                                <Select
                                    value={weightUnit}
                                    onChange={(e) => {
                                        const newUnit = e.target.value as "kg" | "lbs";
                                        // Convert weight if changing units and we have a value
                                        if (weightValue) {
                                            const currentWeight = parseFloat(weightValue);
                                            if (!isNaN(currentWeight) && currentWeight > 0) {
                                                if (weightUnit === "kg" && newUnit === "lbs") {
                                                    setWeightValue((currentWeight * 2.20462).toFixed(1));
                                                } else if (weightUnit === "lbs" && newUnit === "kg") {
                                                    setWeightValue((currentWeight / 2.20462).toFixed(1));
                                                }
                                            }
                                        }
                                        setWeightUnit(newUnit);
                                    }}
                                    disabled={isSavingWeight}
                                    className="flex-[1] w-auto min-w-[80px]"
                                >
                                    <option value="kg">kg</option>
                                    <option value="lbs">lbs</option>
                                </Select>
                            </div>
                            {weightEntry && (
                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Current weight: {weightEntry.weight} {weightEntry.unit} (last updated {new Date(weightEntry.updated_at).toLocaleDateString()})
                                </Text>
                            )}
                        </Field>
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setIsWeightDialogOpen(false)} disabled={isSavingWeight}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveWeight} disabled={isSavingWeight || !weightValue || parseFloat(weightValue) <= 0}>
                        {isSavingWeight ? "Saving..." : weightEntry ? "Update" : "Save"}
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
                    Copy all activities from one week to another. Select the Monday of each week.
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
                            Note: Existing activities on the target week will not be removed. The copied activities will be added alongside them.
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
                            id: "add-activity",
                            label: "Add Activity",
                            icon: <Plus className="h-5 w-5" />,
                            onClick: () => {
                                resetAddDialog();
                                setIsAddDialogOpen(true);
                            }
                        },
                        {
                            id: "add-weight",
                            label: weightEntry ? "Update Weight" : "Add Weight",
                            icon: <Scale className="h-5 w-5" />,
                            onClick: handleOpenWeightDialog
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
                                disabled: activities.length === 0
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

export default ProgressTracking;
