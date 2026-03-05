import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { useState, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { Textarea } from "@components/textarea";
import { Badge } from "@components/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@components/dialog";
import { Field, Label as FieldLabel, Description, Fieldset, Legend } from "@components/fieldset";
import { Radio, RadioField, RadioGroup } from "@components/radio";
import { Checkbox, CheckboxField } from "@components/checkbox";
import { Switch, SwitchField } from "@components/switch";
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from "@components/dropdown";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Bell, MoreVertical, Crown } from "lucide-react";

// Get auth headers for API requests
function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    const token = typeof window !== "undefined"
        ? localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token")
        : null;
    const headers: Record<string, string> = { ...extra };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

// Reminder interface matching the database schema
interface Reminder {
    id: number;
    title: string;
    message: string;
    delivery_type: "email" | "sms";
    schedule_type: "once" | "recurring";
    scheduled_at: string | null;
    recurrence_pattern: string | null;
    recurrence_days: number[] | null;
    recurrence_time: string;
    timezone: string;
    is_active: boolean;
    next_fire_at: string | null;
    last_fired_at: string | null;
    created_at: string;
    updated_at: string;
}

// Form state for creating/editing reminders
interface ReminderForm {
    title: string;
    message: string;
    deliveryType: "email" | "sms";
    scheduleType: "once" | "recurring";
    scheduledDate: string;
    scheduledTime: string;
    recurrencePattern: string;
    recurrenceDays: number[];
    recurrenceTime: string;
    timezone: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Get the user's timezone
function getUserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return "UTC";
    }
}

// Convert a local time to UTC using the given timezone
function localToUtc(year: number, month: number, day: number, hours: number, minutes: number, timezone: string): Date {
    // Start with a guess: treat the local components as UTC
    const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

    // See what this UTC instant looks like in the target timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const parts = formatter.formatToParts(guess);
    const localH = Number(parts.find(p => p.type === "hour")?.value);
    const localM = Number(parts.find(p => p.type === "minute")?.value);
    const localD = Number(parts.find(p => p.type === "day")?.value);

    // Offset = how much the timezone shifted our guess
    const offsetMs = ((localD - day) * 86400000) + ((localH - hours) * 3600000) + ((localM - minutes) * 60000);
    return new Date(guess.getTime() - offsetMs);
}

// Format a UTC timestamp for display in a given timezone
function formatDateTime(isoString: string | null, timezone: string): string {
    if (!isoString) return "—";
    try {
        const date = new Date(isoString);
        return date.toLocaleString("en-US", {
            timeZone: timezone,
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
    } catch {
        return isoString;
    }
}

// Describe a recurrence pattern
function describeSchedule(reminder: Reminder): string {
    if (reminder.schedule_type === "once") {
        return formatDateTime(reminder.scheduled_at, reminder.timezone);
    }

    const time = reminder.recurrence_time ? reminder.recurrence_time.slice(0, 5) : "";
    switch (reminder.recurrence_pattern) {
        case "daily":
            return `Daily at ${time}`;
        case "weekly": {
            const day = reminder.recurrence_days?.[0];
            return `Weekly on ${day !== undefined ? DAY_LABELS[day] : "?"} at ${time}`;
        }
        case "weekdays":
            return `Weekdays at ${time}`;
        case "weekends":
            return `Weekends at ${time}`;
        case "custom": {
            const days = (reminder.recurrence_days || []).map(d => DAY_LABELS[d]).join(", ");
            return `${days} at ${time}`;
        }
        default:
            return `Recurring at ${time}`;
    }
}

const defaultForm: ReminderForm = {
    title: "",
    message: "",
    deliveryType: "email",
    scheduleType: "once",
    scheduledDate: "",
    scheduledTime: "",
    recurrencePattern: "daily",
    recurrenceDays: [],
    recurrenceTime: "",
    timezone: getUserTimezone()
};

const Reminders: React.FC = () => {
    const loaderData = useLoaderData() as {
        title: string;
        meta: unknown[];
        reminders?: Reminder[];
        isGated?: boolean;
        isPro?: boolean;
        daysLogged?: number;
        phoneVerified?: boolean;
        phoneNumber?: string | null;
        error?: string;
    };
    const helmet = useHelmet();

    const [reminders, setReminders] = useState<Reminder[]>(loaderData.reminders || []);
    const [isGated] = useState(loaderData.isGated || false);
    const [isPro] = useState(loaderData.isPro || false);
    const [daysLogged] = useState(loaderData.daysLogged || 0);
    const [phoneVerified] = useState(loaderData.phoneVerified || false);

    // Free users: max 5 reminders
    const freeLimit = 5;
    const atFreeLimit = !isPro && reminders.length >= freeLimit;

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<number | null>(null);
    const [form, setForm] = useState<ReminderForm>({ ...defaultForm });
    const [isSaving, setIsSaving] = useState(false);

    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Open create dialog with default form
    const openCreateDialog = useCallback(() => {
        setForm({ ...defaultForm, timezone: getUserTimezone() });
        setEditingReminder(null);
        setIsCreateDialogOpen(true);
    }, []);

    // Open edit dialog with existing reminder data
    const openEditDialog = useCallback((reminder: Reminder) => {
        let scheduledDate = "";
        let scheduledTime = "";

        if (reminder.scheduled_at) {
            // Convert UTC timestamp to local date/time in the reminder's timezone
            const date = new Date(reminder.scheduled_at);
            const dateFormatter = new Intl.DateTimeFormat("en-CA", {
                timeZone: reminder.timezone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            });
            scheduledDate = dateFormatter.format(date);
            scheduledTime = date.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: reminder.timezone
            });
        }

        setForm({
            title: reminder.title,
            message: reminder.message,
            deliveryType: reminder.delivery_type,
            scheduleType: reminder.schedule_type,
            scheduledDate,
            scheduledTime,
            recurrencePattern: reminder.recurrence_pattern || "daily",
            recurrenceDays: reminder.recurrence_days || [],
            recurrenceTime: reminder.recurrence_time ? reminder.recurrence_time.slice(0, 5) : "",
            timezone: reminder.timezone
        });
        setEditingReminder(reminder);
        setIsCreateDialogOpen(true);
    }, []);

    // Save reminder (create or update)
    const handleSaveReminder = useCallback(async () => {
        if (!form.title.trim() || !form.message.trim()) {
            toast.error("Title and message are required");
            return;
        }

        if (form.scheduleType === "once" && (!form.scheduledDate || !form.scheduledTime)) {
            toast.error("Date and time are required for one-time reminders");
            return;
        }

        if (form.scheduleType === "recurring" && !form.recurrenceTime) {
            toast.error("Time is required for recurring reminders");
            return;
        }

        if (form.scheduleType === "recurring" && (form.recurrencePattern === "weekly" || form.recurrencePattern === "custom") && form.recurrenceDays.length === 0) {
            toast.error("Please select at least one day");
            return;
        }

        setIsSaving(true);

        try {
            // Build scheduledAt in UTC from the user's local date/time/timezone
            let scheduledAt: string | null = null;
            if (form.scheduleType === "once") {
                const [year, month, day] = form.scheduledDate.split("-").map(Number);
                const [hours, minutes] = form.scheduledTime.split(":").map(Number);
                const utcDate = localToUtc(year, month, day, hours, minutes, form.timezone);
                scheduledAt = utcDate.toISOString();
            }

            const body = {
                title: form.title.trim(),
                message: form.message.trim(),
                deliveryType: form.deliveryType,
                scheduleType: form.scheduleType,
                scheduledAt,
                recurrencePattern: form.scheduleType === "recurring" ? form.recurrencePattern : null,
                recurrenceDays: form.scheduleType === "recurring" && (form.recurrencePattern === "weekly" || form.recurrencePattern === "custom") ? form.recurrenceDays : null,
                recurrenceTime: form.scheduleType === "recurring" ? form.recurrenceTime : form.scheduledTime,
                timezone: form.timezone
            };

            const url = editingReminder ? `/api/reminders/${editingReminder.id}` : "/api/reminders";
            const method = editingReminder ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                credentials: "include",
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                toast.error(errorData.error || "Failed to save reminder");
                return;
            }

            const data = await response.json();

            if (editingReminder) {
                setReminders(prev => prev.map(r => r.id === editingReminder.id ? data.reminder : r));
                toast.success("Reminder updated!");
            } else {
                setReminders(prev => [data.reminder, ...prev]);
                toast.success("Reminder created!");
            }

            setIsCreateDialogOpen(false);
            setEditingReminder(null);
        } catch (error) {
            console.error("Error saving reminder:", error);
            toast.error("Failed to save reminder. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }, [form, editingReminder]);

    // Delete reminder
    const handleDeleteReminder = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/reminders/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
                credentials: "include"
            });

            if (response.ok) {
                setReminders(prev => prev.filter(r => r.id !== id));
                setIsDeleteDialogOpen(null);
                toast.success("Reminder deleted!");
            } else {
                toast.error("Failed to delete reminder");
            }
        } catch (error) {
            console.error("Error deleting reminder:", error);
            toast.error("Failed to delete reminder. Please try again.");
        }
    }, []);

    // Toggle reminder active/inactive
    const handleToggleReminder = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/reminders/${id}/toggle`, {
                method: "PATCH",
                headers: getAuthHeaders(),
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setReminders(prev => prev.map(r => r.id === id ? data.reminder : r));
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Failed to toggle reminder");
            }
        } catch (error) {
            console.error("Error toggling reminder:", error);
            toast.error("Failed to toggle reminder. Please try again.");
        }
    }, []);

    // Toggle day selection for custom recurrence
    const toggleDay = useCallback((day: number) => {
        setForm(prev => {
            const days = prev.recurrenceDays.includes(day)
                ? prev.recurrenceDays.filter(d => d !== day)
                : [...prev.recurrenceDays, day].sort();
            return { ...prev, recurrenceDays: days };
        });
    }, []);

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo href="\dashboard" className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/reminders" />}
        >
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Heading level={1}>Reminders</Heading>
                        <Text className="mt-1 text-zinc-600 dark:text-zinc-400">
                            Set custom reminders to stay on track with your fitness goals.
                        </Text>
                        <Badge color="amber" className="mt-2">Beta — bugs may occur</Badge>
                    </div>
                    {!isGated && reminders.length > 0 && !atFreeLimit && (
                        <Button onClick={openCreateDialog}>
                            <Plus className="size-4" data-slot="icon" />
                            Create Reminder
                        </Button>
                    )}
                </div>

                {/* Free plan limit banner */}
                {!isGated && atFreeLimit && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                        <Text className="text-amber-700 dark:text-amber-400">
                            Free plan allows up to {freeLimit} reminders. <a href="/dashboard/settings" className="font-medium underline">Upgrade to Pro</a> for unlimited reminders.
                        </Text>
                    </div>
                )}

                <div className="mt-8">
                    {/* Gated state - user needs more days logged */}
                    {isGated ? (
                        <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                            <img
                                src="https://cdn.nobull.fit/reminders.png"
                                alt="Reminders locked"
                                className="mx-auto h-48 w-48 object-contain"
                            />
                            <Heading level={2} className="mt-4">
                                Reminders Unlock After 10 Days of Tracking
                            </Heading>
                            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                                You&apos;ve logged {daysLogged} of 10 days. Keep tracking your food or activities to unlock custom reminders!
                            </Text>
                        </div>
                    ) : reminders.length === 0 ? (
                        /* Empty state - no reminders yet */
                        <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                            <img
                                src="https://cdn.nobull.fit/reminders.png"
                                alt="No reminders"
                                className="mx-auto h-48 w-48 object-contain"
                            />
                            <Heading level={2} className="mt-4">
                                No Reminders Set
                            </Heading>
                            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                                Create reminders to stay on track with your fitness goals. Get notified via email or SMS.
                            </Text>
                            <Button className="mt-4" onClick={openCreateDialog}>
                                <Plus className="size-4" data-slot="icon" />
                                Create Reminder
                            </Button>
                        </div>
                    ) : (
                        /* Reminders list */
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeader className="min-w-50">Title</TableHeader>
                                                <TableHeader className="hidden sm:table-cell min-w-20">Type</TableHeader>
                                                <TableHeader className="hidden md:table-cell min-w-30">Schedule</TableHeader>
                                                <TableHeader className="hidden lg:table-cell min-w-30">Next Fire</TableHeader>
                                                <TableHeader className="min-w-16">Active</TableHeader>
                                                <TableHeader className="min-w-12 text-right"></TableHeader>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {reminders.map(reminder => (
                                                <TableRow key={reminder.id}>
                                                    <TableCell className="font-medium">{reminder.title}</TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        <Badge color={reminder.delivery_type === "email" ? "blue" : "green"}>
                                                            {reminder.delivery_type === "email" ? "Email" : "SMS"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        <Text className="text-sm">{describeSchedule(reminder)}</Text>
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell">
                                                        <Text className="text-sm">
                                                            {reminder.is_active
                                                                ? formatDateTime(reminder.next_fire_at, reminder.timezone)
                                                                : "—"}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell>
                                                        <SwitchField>
                                                            <Switch
                                                                checked={reminder.is_active}
                                                                onChange={() => handleToggleReminder(reminder.id)}
                                                            />
                                                        </SwitchField>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end">
                                                            <Dropdown>
                                                                <DropdownButton plain className="p-2" aria-label="Reminder options">
                                                                    <MoreVertical className="h-5 w-5" />
                                                                </DropdownButton>
                                                                <DropdownMenu anchor="bottom end" className="min-w-40">
                                                                    <DropdownItem onClick={() => openEditDialog(reminder)}>
                                                                        <Pencil className="h-4 w-4" data-slot="icon" />
                                                                        <DropdownLabel>Edit</DropdownLabel>
                                                                    </DropdownItem>
                                                                    <DropdownItem onClick={() => setIsDeleteDialogOpen(reminder.id)}>
                                                                        <Trash2 className="h-4 w-4" data-slot="icon" />
                                                                        <DropdownLabel>Delete</DropdownLabel>
                                                                    </DropdownItem>
                                                                </DropdownMenu>
                                                            </Dropdown>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Reminder Dialog */}
            <Dialog open={isCreateDialogOpen} onClose={() => { setIsCreateDialogOpen(false); setEditingReminder(null); }} size="2xl">
                <DialogTitle>
                    <div className="flex items-center gap-2">
                        {isPro
                            ? <Crown className="h-5 w-5 text-amber-500" />
                            : <Bell className="h-5 w-5" />
                        }
                        {editingReminder ? "Edit Reminder" : "Create Reminder"}
                    </div>
                </DialogTitle>
                <DialogDescription>
                    Set up a reminder to be delivered via email or SMS.
                </DialogDescription>
                <DialogBody>
                    <div className="space-y-6">
                        {/* Title */}
                        <Field>
                            <FieldLabel>Title</FieldLabel>
                            <Input
                                value={form.title}
                                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g., Log your meals"
                                maxLength={255}
                            />
                        </Field>

                        {/* Message */}
                        <Field>
                            <FieldLabel>Message</FieldLabel>
                            <Textarea
                                value={form.message}
                                onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="The message you'll receive in your reminder"
                                rows={3}
                                maxLength={form.deliveryType === "sms" ? 110 : 2000}
                            />
                            <Description>
                                {form.message.length}/{form.deliveryType === "sms" ? 110 : 2000} characters
                            </Description>
                        </Field>

                        {/* Delivery Type */}
                        <Fieldset>
                            <Legend>Delivery Type</Legend>
                            <RadioGroup
                                value={form.deliveryType}
                                onChange={(value: string) => {
                                    // Only allow switching to SMS if phone is verified
                                    if (value === "sms" && !phoneVerified) return;
                                    setForm(prev => ({ ...prev, deliveryType: value as "email" | "sms" }));
                                }}
                            >
                                <RadioField>
                                    <Radio value="email" />
                                    <FieldLabel>Email</FieldLabel>
                                    <Description>Receive reminders at your account email address</Description>
                                </RadioField>
                                <RadioField>
                                    <Radio value="sms" disabled={!phoneVerified} />
                                    <FieldLabel>SMS</FieldLabel>
                                    <Description>
                                        {phoneVerified
                                            ? "Receive reminders via text message"
                                            : "Set up your phone number in Settings to enable SMS reminders"}
                                    </Description>
                                </RadioField>
                            </RadioGroup>
                        </Fieldset>

                        {/* Schedule Type */}
                        <Fieldset>
                            <Legend>Schedule</Legend>
                            <RadioGroup
                                value={form.scheduleType}
                                onChange={(value: string) => setForm(prev => ({ ...prev, scheduleType: value as "once" | "recurring" }))}
                            >
                                <RadioField>
                                    <Radio value="once" />
                                    <FieldLabel>One-time</FieldLabel>
                                    <Description>Send once at a specific date and time</Description>
                                </RadioField>
                                <RadioField>
                                    <Radio value="recurring" />
                                    <FieldLabel>Recurring</FieldLabel>
                                    <Description>Send on a regular schedule</Description>
                                </RadioField>
                            </RadioGroup>
                        </Fieldset>

                        {/* One-time: Date and Time */}
                        {form.scheduleType === "once" && (
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel>Date</FieldLabel>
                                    <Input
                                        type="date"
                                        value={form.scheduledDate}
                                        onChange={e => setForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                                        min={new Date().toISOString().split("T")[0]}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Time</FieldLabel>
                                    <Input
                                        type="time"
                                        value={form.scheduledTime}
                                        onChange={e => setForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                    />
                                </Field>
                            </div>
                        )}

                        {/* Recurring: Pattern, Days, Time */}
                        {form.scheduleType === "recurring" && (
                            <div className="space-y-4">
                                <Field>
                                    <FieldLabel>Pattern</FieldLabel>
                                    <Select
                                        value={form.recurrencePattern}
                                        onChange={e => setForm(prev => ({ ...prev, recurrencePattern: e.target.value, recurrenceDays: [] }))}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="weekdays">Weekdays (Mon-Fri)</option>
                                        <option value="weekends">Weekends (Sat-Sun)</option>
                                        <option value="custom">Custom</option>
                                    </Select>
                                </Field>

                                {/* Weekly: select one day */}
                                {form.recurrencePattern === "weekly" && (
                                    <Field>
                                        <FieldLabel>Day of Week</FieldLabel>
                                        <Select
                                            value={form.recurrenceDays[0]?.toString() || ""}
                                            onChange={e => setForm(prev => ({ ...prev, recurrenceDays: [parseInt(e.target.value, 10)] }))}
                                        >
                                            <option value="" disabled>Select a day</option>
                                            {DAY_LABELS.map((label, index) => (
                                                <option key={index} value={index}>{label}</option>
                                            ))}
                                        </Select>
                                    </Field>
                                )}

                                {/* Custom: select multiple days */}
                                {form.recurrencePattern === "custom" && (
                                    <Fieldset>
                                        <Legend>Days</Legend>
                                        <div className="flex flex-wrap gap-3">
                                            {DAY_LABELS.map((label, index) => (
                                                <CheckboxField key={index}>
                                                    <Checkbox
                                                        checked={form.recurrenceDays.includes(index)}
                                                        onChange={() => toggleDay(index)}
                                                    />
                                                    <FieldLabel>{label}</FieldLabel>
                                                </CheckboxField>
                                            ))}
                                        </div>
                                    </Fieldset>
                                )}

                                <Field>
                                    <FieldLabel>Time</FieldLabel>
                                    <Input
                                        type="time"
                                        value={form.recurrenceTime}
                                        onChange={e => setForm(prev => ({ ...prev, recurrenceTime: e.target.value }))}
                                    />
                                </Field>
                            </div>
                        )}

                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => { setIsCreateDialogOpen(false); setEditingReminder(null); }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveReminder}
                        disabled={isSaving || (form.deliveryType === "sms" && !phoneVerified)}
                    >
                        {isSaving ? "Saving..." : editingReminder ? "Update Reminder" : "Create Reminder"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen !== null} onClose={() => setIsDeleteDialogOpen(null)}>
                <DialogTitle>Delete Reminder</DialogTitle>
                <DialogDescription>
                    Are you sure you want to delete this reminder? This action cannot be undone.
                </DialogDescription>
                <DialogActions>
                    <Button plain onClick={() => setIsDeleteDialogOpen(null)}>
                        Cancel
                    </Button>
                    <Button color="red" onClick={() => isDeleteDialogOpen && handleDeleteReminder(isDeleteDialogOpen)}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </SidebarLayout>
    );
};

export default Reminders;
