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
});

