import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Field, Label, Description } from "@components/fieldset";
import { Input } from "@components/input";
import { Button } from "@components/button";
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from "@components/dialog";
import { Select } from "@components/select";
import { Checkbox, CheckboxField, CheckboxGroup } from "@components/checkbox";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { useAuth } from "@core/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Settings: React.FC = () => {
    const loaderData = useLoaderData() as { title?: string; meta?: unknown[]; user?: { email: string } } | undefined;
    const helmet = useHelmet();
    const { user } = useAuth();
    const [email, setEmail] = useState(loaderData?.user?.email || user?.email || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Password change state
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    // Account deletion state
    const [deletePassword, setDeletePassword] = useState("");
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const navigate = useNavigate();
    
    // Data export state
    const [isExportingData, setIsExportingData] = useState(false);
    
    // Delete data state
    const [showDeleteDataDialog, setShowDeleteDataDialog] = useState(false);
    const [deleteDataPassword, setDeleteDataPassword] = useState("");
    const [deleteDataTimePeriod, setDeleteDataTimePeriod] = useState<"7" | "30" | "all">("7");
    const [deleteDataTypes, setDeleteDataTypes] = useState<string[]>([]);
    const [isDeletingData, setIsDeletingData] = useState(false);
    
    // User preferences state
    const [quickAddDays, setQuickAddDays] = useState<number>(30);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);
    
    // Communication preferences state - initialize as false to prevent hydration mismatch
    const [communicationEmail, setCommunicationEmail] = useState<boolean>(false);
    const [communicationSms, setCommunicationSms] = useState<boolean>(false);
    const [communicationPush, setCommunicationPush] = useState<boolean>(false);
    const [isSavingCommunication, setIsSavingCommunication] = useState(false);

    // Set helmet values
    if (loaderData?.title) {
        helmet.setTitle(loaderData.title);
    }
    if (loaderData?.meta) {
        helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);
    }

    // Fetch user preferences on mount
    const fetchPreferences = useCallback(async () => {
        try {
            const response = await fetch("/api/settings/preferences", {
                credentials: "include"
            });
            if (response.ok) {
                const data = await response.json();
                setQuickAddDays(data.quick_add_days ?? 30);
                setCommunicationEmail(data.communication_email ?? true);
                setCommunicationSms(data.communication_sms ?? false);
                setCommunicationPush(data.communication_push ?? false);
            }
        } catch (error) {
            console.error("Error fetching preferences:", error);
        }
    }, []);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    // Handle preferences save
    const handleSavePreferences = async () => {
        setIsSavingPreferences(true);

        try {
            const response = await fetch("/api/settings/preferences", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ quick_add_days: quickAddDays })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to save preferences.");
                setIsSavingPreferences(false);
                return;
            }

            toast.success("Preferences saved successfully.");
            setIsSavingPreferences(false);
        } catch (error) {
            toast.error("An error occurred. Please try again.");
            setIsSavingPreferences(false);
        }
    };

    // Handle communication preferences save
    const handleSaveCommunicationPreferences = async () => {
        setIsSavingCommunication(true);

        try {
            const response = await fetch("/api/settings/preferences", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    communication_email: communicationEmail,
                    communication_sms: communicationSms,
                    communication_push: communicationPush
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to save communication preferences.");
                setIsSavingCommunication(false);
                return;
            }

            toast.success("Communication preferences saved successfully.");
            setIsSavingCommunication(false);
        } catch (error) {
            toast.error("An error occurred. Please try again.");
            setIsSavingCommunication(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const newEmail = formData.get("email") as string;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            toast.error("Please enter a valid email address.");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch("/api/settings/change-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ email: newEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to request email change. Please try again.");
                setIsSubmitting(false);
                return;
            }

            toast.success("A confirmation email has been sent to your new email address. Please check your inbox and click the confirmation link to complete the change.");
            setIsSubmitting(false);
        } catch (err) {
            toast.error("An error occurred. Please try again.");
            setIsSubmitting(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsChangingPassword(true);

        // Validate password length
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters long.");
            setIsChangingPassword(false);
            return;
        }

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation password do not match.");
            setIsChangingPassword(false);
            return;
        }

        try {
            const response = await fetch("/api/settings/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to change password. Please try again.");
                setIsChangingPassword(false);
                return;
            }

            toast.success("Password has been changed successfully. A confirmation email has been sent to your email address.");
            // Clear password fields
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setIsChangingPassword(false);
        } catch (err) {
            toast.error("An error occurred. Please try again.");
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsDeletingAccount(true);

        if (!deletePassword) {
            toast.error("Password is required to confirm account deletion.");
            setIsDeletingAccount(false);
            return;
        }

        try {
            const response = await fetch("/api/settings/delete-account", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    password: deletePassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to delete account. Please try again.");
                setIsDeletingAccount(false);
                return;
            }

            // Account deleted successfully - logout and redirect
            if (typeof window !== "undefined") {
                localStorage.removeItem("auth_token");
                sessionStorage.removeItem("auth_token");
            }
            
            // Redirect to home page
            window.location.href = "/";
        } catch (err) {
            toast.error("An error occurred. Please try again.");
            setIsDeletingAccount(false);
        }
    };

    const handleExportData = async () => {
        setIsExportingData(true);

        try {
            const response = await fetch("/api/settings/export-data", {
                method: "GET",
                credentials: "include"
            });

            if (!response.ok) {
                const data = await response.json();
                toast.error(data.error || "Failed to export data. Please try again.");
                setIsExportingData(false);
                return;
            }

            // Get the JSON data
            const data = await response.json();

            // Create a blob and download it
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `nobullfit-data-export-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Data exported successfully!");
            setIsExportingData(false);
        } catch (err) {
            toast.error("An error occurred while exporting your data. Please try again.");
            setIsExportingData(false);
        }
    };

    const handleDeleteData = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsDeletingData(true);

        if (!deleteDataPassword) {
            toast.error("Password is required to confirm data deletion.");
            setIsDeletingData(false);
            return;
        }

        if (deleteDataTypes.length === 0) {
            toast.error("Please select at least one data type to delete.");
            setIsDeletingData(false);
            return;
        }

        try {
            const response = await fetch("/api/settings/delete-data", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    password: deleteDataPassword,
                    timePeriod: deleteDataTimePeriod,
                    dataTypes: deleteDataTypes
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to delete data. Please try again.");
                setIsDeletingData(false);
                return;
            }

            toast.success("Selected data has been successfully deleted.");
            setDeleteDataPassword("");
            setDeleteDataTypes([]);
            setDeleteDataTimePeriod("7");
            setIsDeletingData(false);
            setShowDeleteDataDialog(false);
        } catch (err) {
            toast.error("An error occurred. Please try again.");
            setIsDeletingData(false);
        }
    };

    const handleDataTypeToggle = (dataType: string) => {
        setDeleteDataTypes(prev => 
            prev.includes(dataType) 
                ? prev.filter(type => type !== dataType)
                : [...prev, dataType]
        );
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
            sidebar={<DashboardSidebar currentPath="/dashboard/settings" />}
        >
            <div className="space-y-8">
                <div>
                    <Heading level={1}>Settings</Heading>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-8">
                    <Field>
                        <Label>Email Address</Label>
                        <Description>
                            We'll send a confirmation link to your new email address. The change will only take effect after you confirm it.
                        </Description>
                        <Input
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </Field>

                    <div className="flex justify-end gap-3">
                        <Button type="button" outline onClick={() => setEmail(loaderData?.user?.email || user?.email || "")}>
                            Reset
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Save changes"}
                        </Button>
                    </div>
                </form>

                <div className="border-t border-zinc-950/10 dark:border-white/10 pt-8">
                    <div className="space-y-6">
                        <div>
                            <Heading level={2} className="text-lg font-semibold">
                                Preferences
                            </Heading>
                            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                Customize your NoBullFit experience.
                            </Text>
                        </div>

                        <Field>
                            <Label>Quick Add History</Label>
                            <Description>
                                Choose how far back to show previously logged foods and recipes in the Quick Add dropdown on the Food Tracking page.
                            </Description>
                            <Select
                                value={quickAddDays.toString()}
                                onChange={(e) => setQuickAddDays(parseInt(e.target.value, 10))}
                            >
                                <option value="30">Last 30 days</option>
                                <option value="60">Last 60 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="120">Last 120 days</option>
                                <option value="0">All Time</option>
                            </Select>
                        </Field>

                        <div className="flex justify-end">
                            <Button onClick={handleSavePreferences} disabled={isSavingPreferences}>
                                {isSavingPreferences ? "Saving..." : "Save Preferences"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-950/10 dark:border-white/10 pt-8">
                    <div className="space-y-6">
                        <div>
                            <Heading level={2} className="text-lg font-semibold">
                                Communication Preferences
                            </Heading>
                            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                Choose how you want to receive notifications and updates from NoBullFit.
                            </Text>
                        </div>

                        <CheckboxGroup>
                            <CheckboxField>
                                <Checkbox
                                    checked={communicationEmail}
                                    onChange={(checked) => setCommunicationEmail(checked)}
                                />
                                <Label>Email</Label>
                                <Description>
                                    Receive notifications and updates via email
                                </Description>
                            </CheckboxField>

                            <CheckboxField>
                                <Checkbox
                                    checked={communicationSms}
                                    onChange={(checked) => setCommunicationSms(checked)}
                                    disabled
                                />
                                <Label>SMS</Label>
                                <Description>
                                    Receive notifications via text message (coming soon)
                                </Description>
                            </CheckboxField>

                            <CheckboxField>
                                <Checkbox
                                    checked={communicationPush}
                                    onChange={(checked) => setCommunicationPush(checked)}
                                    disabled
                                />
                                <Label>Push Notifications</Label>
                                <Description>
                                    Receive push notifications in your browser (coming soon)
                                </Description>
                            </CheckboxField>
                        </CheckboxGroup>

                        <div className="flex justify-end">
                            <Button onClick={handleSaveCommunicationPreferences} disabled={isSavingCommunication}>
                                {isSavingCommunication ? "Saving..." : "Save Communication Preferences"}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-950/10 dark:border-white/10 pt-8">
                    <form onSubmit={handlePasswordSubmit} className="space-y-8">
                        <Field>
                            <Label>Current Password</Label>
                            <Description>
                                Enter your current password to verify your identity.
                            </Description>
                            <Input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </Field>

                        <Field>
                            <Label>New Password</Label>
                            <Description>
                                Your new password must be at least 8 characters long.
                            </Description>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                minLength={8}
                            />
                        </Field>

                        <Field>
                            <Label>Confirm New Password</Label>
                            <Description>
                                Re-enter your new password to confirm.
                            </Description>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                autoComplete="new-password"
                                minLength={8}
                            />
                        </Field>

                        <div className="flex justify-end gap-3">
                            <Button type="button" outline onClick={() => {
                                setCurrentPassword("");
                                setNewPassword("");
                                setConfirmPassword("");
                                setPasswordError(null);
                                setPasswordSuccess(null);
                            }}>
                                Reset
                            </Button>
                            <Button type="submit" disabled={isChangingPassword}>
                                {isChangingPassword ? "Changing..." : "Change password"}
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="border-t border-zinc-950/10 dark:border-white/10 pt-8">
                    <div className="space-y-6">
                        <div>
                            <Heading level={2} className="text-lg font-semibold">
                                Data & Privacy
                            </Heading>
                            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                Download a copy of all your data stored in NoBullFit.
                            </Text>
                        </div>

                        <div>
                            <Button
                                type="button"
                                outline
                                onClick={handleExportData}
                                disabled={isExportingData}
                            >
                                {isExportingData ? "Exporting..." : "Download My Data"}
                            </Button>
                            <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Your data will be downloaded as a JSON file containing your profile, recipes, favorites, grocery lists, food tracking, progress tracking, weight tracking, and TDEE data.
                            </Text>
                        </div>
                    </div>
                </div>

                <div className="border-t border-zinc-950/10 dark:border-white/10 pt-8">
                    <div className="flex flex-col gap-8 sm:flex-row sm:gap-8">
                        <div className="flex-1 space-y-6">
                            <div>
                                <Heading level={2} className="text-lg font-semibold">
                                    Delete Data
                                </Heading>
                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Delete specific data from your account by selecting a time period and data types.
                                </Text>
                            </div>

                            <div>
                                <Button
                                    type="button"
                                    onClick={() => setShowDeleteDataDialog(true)}
                                >
                                    Delete Selected Data
                                </Button>
                                <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                    You can delete recipes, favorites, grocery lists, food tracking, progress tracking, weight tracking, or TDEE data for the last 7 days, 30 days, or all time.
                                </Text>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <Heading level={2} className="text-lg font-semibold text-red-600 dark:text-red-400">
                                    Danger Zone
                                </Heading>
                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    Once you delete your account, there is no going back. Please be certain.
                                </Text>
                            </div>

                            <div>
                                <Button
                                    type="button"
                                    color="red"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Delete Account
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <Dialog open={showDeleteConfirm} onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword("");
                }}>
                    <form onSubmit={handleDeleteAccount}>
                        <DialogTitle>Delete Account</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove all of your data.
                        </DialogDescription>
                        <DialogBody>
                            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20 mb-4">
                                <Text className="mb-3 font-semibold text-red-900 dark:text-red-400">
                                    Warning: This action cannot be undone
                                </Text>
                                <Text className="mb-2 text-sm text-red-800 dark:text-red-300">
                                    This will permanently delete:
                                </Text>
                                <ul className="list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-300">
                                    <li>All your recipes</li>
                                    <li>Your favorites</li>
                                    <li>Your grocery lists</li>
                                    <li>Your food tracking data</li>
                                    <li>Your progress tracking data</li>
                                    <li>All other account information</li>
                                </ul>
                            </div>

                            <Field>
                                <Label>Confirm Password</Label>
                                <Description>
                                    Enter your password to confirm that you want to permanently delete your account.
                                </Description>
                                <Input
                                    type="password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                />
                            </Field>
                        </DialogBody>
                        <DialogActions>
                            <Button
                                type="button"
                                plain
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeletePassword("");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                color="red"
                                disabled={isDeletingAccount}
                            >
                                {isDeletingAccount ? "Deleting..." : "Delete Account"}
                            </Button>
                        </DialogActions>
                    </form>
                </Dialog>

                <Dialog open={showDeleteDataDialog} onClose={() => {
                    setShowDeleteDataDialog(false);
                    setDeleteDataPassword("");
                    setDeleteDataTypes([]);
                    setDeleteDataTimePeriod("7");
                }}>
                    <form onSubmit={handleDeleteData}>
                        <DialogTitle>Delete Selected Data</DialogTitle>
                        <DialogDescription>
                            Select a time period and data types to delete. This action cannot be undone.
                        </DialogDescription>
                        <DialogBody>
                            <div className="space-y-6">
                                <Field>
                                    <Label>Time Period</Label>
                                    <Select
                                        value={deleteDataTimePeriod}
                                        onChange={(e) => setDeleteDataTimePeriod(e.target.value as "7" | "30" | "all")}
                                        disabled={isDeletingData}
                                    >
                                        <option value="7">Last 7 days</option>
                                        <option value="30">Last 30 days</option>
                                        <option value="all">All time</option>
                                    </Select>
                                    <Description>
                                        Select the time period for data deletion.
                                    </Description>
                                </Field>

                                <Field>
                                    <Label>Data Types to Delete</Label>
                                    <CheckboxGroup>
                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("recipes")}
                                                onChange={() => handleDataTypeToggle("recipes")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>Recipes</Label>
                                            <Description>Delete your created recipes</Description>
                                        </CheckboxField>

                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("favorites")}
                                                onChange={() => handleDataTypeToggle("favorites")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>Favorites</Label>
                                            <Description>Delete your favorited foods and recipes</Description>
                                        </CheckboxField>

                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("grocery_lists")}
                                                onChange={() => handleDataTypeToggle("grocery_lists")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>Grocery Lists</Label>
                                            <Description>Delete your grocery lists</Description>
                                        </CheckboxField>

                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("food_tracking")}
                                                onChange={() => handleDataTypeToggle("food_tracking")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>Food Tracking</Label>
                                            <Description>Delete your logged food entries</Description>
                                        </CheckboxField>

                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("progress_tracking")}
                                                onChange={() => handleDataTypeToggle("progress_tracking")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>Progress Tracking</Label>
                                            <Description>Delete your logged activities and exercises</Description>
                                        </CheckboxField>

                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("weight_tracking")}
                                                onChange={() => handleDataTypeToggle("weight_tracking")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>Weight Tracking</Label>
                                            <Description>Delete your weight entries</Description>
                                        </CheckboxField>

                                        <CheckboxField>
                                            <Checkbox
                                                checked={deleteDataTypes.includes("tdee")}
                                                onChange={() => handleDataTypeToggle("tdee")}
                                                disabled={isDeletingData}
                                            />
                                            <Label>TDEE Data</Label>
                                            <Description>Delete your TDEE calculation data</Description>
                                        </CheckboxField>
                                    </CheckboxGroup>
                                </Field>

                                <Field>
                                    <Label>Confirm Password</Label>
                                    <Description>
                                        Enter your password to confirm that you want to delete the selected data.
                                    </Description>
                                    <Input
                                        type="password"
                                        value={deleteDataPassword}
                                        onChange={(e) => setDeleteDataPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        disabled={isDeletingData}
                                    />
                                </Field>
                            </div>
                        </DialogBody>
                        <DialogActions>
                            <Button
                                type="button"
                                plain
                                onClick={() => {
                                    setShowDeleteDataDialog(false);
                                    setDeleteDataPassword("");
                                    setDeleteDataTypes([]);
                                    setDeleteDataTimePeriod("7");
                                }}
                                disabled={isDeletingData}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                color="red"
                                disabled={isDeletingData || deleteDataTypes.length === 0}
                            >
                                {isDeletingData ? "Deleting..." : "Delete Data"}
                            </Button>
                        </DialogActions>
                    </form>
                </Dialog>
            </div>
        </SidebarLayout>
    );
};

export default Settings;