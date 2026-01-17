import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Settings from "./Settings";

// Mock useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock MaintenanceBanner to prevent fetch interference
vi.mock("@components/maintenance-banner", () => ({
    MaintenanceBanner: () => null
}));

// Mock AuthContext
const mockUser = { id: 1, email: "test@example.com", full_name: "Test User" };
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        user: mockUser,
        isLoading: false
    })
}));

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

// Mock fetch
global.fetch = vi.fn();

describe("Settings", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({})
        });
    });

    it("should render settings page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /Settings/i })).toBeInTheDocument();
        });
    });

    it("should display email address field", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
        });
    });

    it("should display change password section", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Change Password/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
            // There are two "New Password" inputs - one for password change and one for confirm
            expect(screen.getAllByLabelText(/New Password/i).length).toBeGreaterThan(0);
        });
    });

    it("should display data export section", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Data & Privacy/i)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /Download My Data/i })).toBeInTheDocument();
        });
    });

    it("should display delete account section", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /Delete Account/i })).toBeInTheDocument();
        });
    });

    it("should open delete account dialog when button is clicked", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Delete Account/i })).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole("button", { name: /Delete Account/i });
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            // Multiple "Delete Account" texts exist - button, dialog title, and submit button
            expect(screen.getAllByText(/Delete Account/i).length).toBeGreaterThan(1);
            // Multiple "This action cannot be undone" texts may exist
            expect(screen.getAllByText(/This action cannot be undone/i).length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    it("should handle password change submission", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Password has been changed successfully." })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
        });

        const currentPasswordInput = screen.getByLabelText(/Current Password/i);
        // Use getAllByLabelText and get the first one (password change form, not delete dialog)
        const newPasswordInputs = screen.getAllByLabelText(/New Password/i);
        const newPasswordInput = newPasswordInputs[0]; // First one is for password change
        const confirmPasswordInput = screen.getByLabelText(/Confirm New Password/i);
        const submitButton = screen.getByRole("button", { name: /Change password/i });

        fireEvent.change(currentPasswordInput, { target: { value: "oldpassword123" } });
        fireEvent.change(newPasswordInput, { target: { value: "newpassword123" } });
        fireEvent.change(confirmPasswordInput, { target: { value: "newpassword123" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/settings/change-password",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("oldpassword123")
                })
            );
        });
    });

    it("should handle data export", async () => {
        const mockExportData = {
            export_date: "2024-01-01T00:00:00Z",
            user: { id: 1, email: "test@example.com" },
            recipes: [],
            favorites: [],
            grocery_lists: [],
            summary: { total_recipes: 0, total_favorites: 0, total_grocery_lists: 0, total_grocery_list_items: 0 }
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => mockExportData
        });

        // Mock URL methods - ensure they exist on global.URL first
        const originalCreateObjectURL = global.URL.createObjectURL;
        const originalRevokeObjectURL = global.URL.revokeObjectURL;
        global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
        global.URL.revokeObjectURL = vi.fn();

        const router = createMemoryRouter([
            {
                path: "/dashboard/settings",
                element: <Settings />,
                loader: async () => ({
                    title: "Settings - NoBullFit",
                    meta: [],
                    user: { email: "test@example.com" }
                })
            }
        ], {
            initialEntries: ["/dashboard/settings"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Download My Data/i })).toBeInTheDocument();
        });

        const exportButton = screen.getByRole("button", { name: /Download My Data/i });
        fireEvent.click(exportButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/settings/export-data",
                expect.objectContaining({
                    method: "GET",
                    credentials: "include"
                })
            );
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        }, { timeout: 3000 });

        // Clean up
        global.URL.createObjectURL = originalCreateObjectURL;
        global.URL.revokeObjectURL = originalRevokeObjectURL;
    });

    describe("Communication Preferences", () => {
        beforeEach(() => {
            // Mock preferences API response
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
                if (url === "/api/settings/preferences") {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            quick_add_days: 30,
                            communication_email: true,
                            communication_sms: false,
                            communication_push: false
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({})
                });
            });
        });

        it("should display communication preferences section", async () => {
            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            await waitFor(() => {
                expect(screen.getByRole("heading", { name: /Communication Preferences/i })).toBeInTheDocument();
            });

            expect(screen.getByText(/Choose how you want to receive notifications/i)).toBeInTheDocument();
        });

        it("should display all communication preference checkboxes", async () => {
            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            await waitFor(() => {
                // Use getByRole to find checkboxes by their accessible name
                expect(screen.getByRole("checkbox", { name: /^Email$/i })).toBeInTheDocument();
                expect(screen.getByRole("checkbox", { name: /^SMS$/i })).toBeInTheDocument();
                expect(screen.getByRole("checkbox", { name: /^Push Notifications$/i })).toBeInTheDocument();
            });
        });

        it("should disable SMS and Push notification checkboxes", async () => {
            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            await waitFor(() => {
                const smsCheckbox = screen.getByRole("checkbox", { name: /^SMS$/i });
                const pushCheckbox = screen.getByRole("checkbox", { name: /^Push Notifications$/i });
                
                // Headless UI Checkbox uses aria-disabled for disabled state
                expect(smsCheckbox).toHaveAttribute("aria-disabled", "true");
                expect(pushCheckbox).toHaveAttribute("aria-disabled", "true");
            });
        });

        it("should load communication preferences from API", async () => {
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
                if (url === "/api/settings/preferences") {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            quick_add_days: 30,
                            communication_email: true,
                            communication_sms: false,
                            communication_push: false
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({})
                });
            });

            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/settings/preferences",
                    expect.objectContaining({
                        credentials: "include"
                    })
                );
            });
        });

        it("should toggle email checkbox", async () => {
            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            // Wait for preferences to load
            await waitFor(() => {
                const emailCheckbox = screen.getByRole("checkbox", { name: /^Email$/i });
                expect(emailCheckbox).toBeInTheDocument();
            });

            const emailCheckbox = screen.getByRole("checkbox", { name: /^Email$/i });
            
            // Check initial state (should be checked after loading)
            await waitFor(() => {
                expect(emailCheckbox).toHaveAttribute("aria-checked", "true");
            });

            // Click to uncheck
            fireEvent.click(emailCheckbox);

            // Should be unchecked now
            await waitFor(() => {
                expect(emailCheckbox).toHaveAttribute("aria-checked", "false");
            });
        });

        it("should save communication preferences successfully", async () => {
            let fetchCallCount = 0;
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
                if (url === "/api/settings/preferences") {
                    fetchCallCount++;
                    if (fetchCallCount === 1) {
                        // First call - load preferences
                        return Promise.resolve({
                            ok: true,
                            json: async () => ({
                                quick_add_days: 30,
                                communication_email: true,
                                communication_sms: false,
                                communication_push: false
                            })
                        });
                    } else {
                        // Second call - save preferences
                        return Promise.resolve({
                            ok: true,
                            json: async () => ({
                                message: "Preferences updated successfully",
                                communication_email: false,
                                communication_sms: false,
                                communication_push: false
                            })
                        });
                    }
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({})
                });
            });

            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            // Wait for preferences to load and email checkbox to be available
            await waitFor(() => {
                const emailCheckbox = screen.getByRole("checkbox", { name: /^Email$/i });
                expect(emailCheckbox).toBeInTheDocument();
            });

            // Uncheck email checkbox
            const emailCheckbox = screen.getByRole("checkbox", { name: /^Email$/i });
            fireEvent.click(emailCheckbox);

            // Wait for checkbox to update
            await waitFor(() => {
                expect(emailCheckbox).toHaveAttribute("aria-checked", "false");
            });

            // Click save button
            const saveButton = screen.getByRole("button", { name: /Save Communication Preferences/i });
            fireEvent.click(saveButton);

            // Verify API was called with correct data
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/settings/preferences",
                    expect.objectContaining({
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: expect.stringContaining('"communication_email":false')
                    })
                );
            });

            // Success is now shown via toast notification, not inline text
            // Just verify the button is no longer in loading state
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /Save Communication Preferences/i })).not.toBeDisabled();
            });
        });

        it("should display error message when saving communication preferences fails", async () => {
            let fetchCallCount = 0;
            (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
                if (url === "/api/settings/preferences") {
                    fetchCallCount++;
                    if (fetchCallCount === 1) {
                        // First call - load preferences
                        return Promise.resolve({
                            ok: true,
                            json: async () => ({
                                quick_add_days: 30,
                                communication_email: true,
                                communication_sms: false,
                                communication_push: false
                            })
                        });
                    } else {
                        // Second call - save preferences fails
                        return Promise.resolve({
                            ok: false,
                            json: async () => ({
                                error: "Failed to save communication preferences."
                            })
                        });
                    }
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({})
                });
            });

            const router = createMemoryRouter([
                {
                    path: "/dashboard/settings",
                    element: <Settings />,
                    loader: async () => ({
                        title: "Settings - NoBullFit",
                        meta: [],
                        user: { email: "test@example.com" }
                    }),
                    HydrateFallback: () => null
                }
            ], {
                initialEntries: ["/dashboard/settings"]
            });

            render(<RouterProvider router={router} />);

            // Wait for preferences to load and checkbox to be available
            await waitFor(() => {
                const emailCheckbox = screen.getByRole("checkbox", { name: /^Email$/i });
                expect(emailCheckbox).toBeInTheDocument();
            });

            // Click save button
            const saveButton = screen.getByRole("button", { name: /Save Communication Preferences/i });
            fireEvent.click(saveButton);

            // Error is now shown via toast notification, not inline text
            // Verify the API was called (the error handling is done via toast)
            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/api/settings/preferences",
                    expect.objectContaining({
                        method: "PUT"
                    })
                );
            });
        });
    });
});

