import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Reminders from "./Reminders";

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
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        user: { id: 1, email: "test@example.com", full_name: "Test User", subscribed: false },
        isLoading: false
    })
}));

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

describe("Reminders", () => {
    it("should render the reminders page heading", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/reminders",
                element: <Reminders />,
                loader: async () => ({
                    title: "Reminders - NoBullFit",
                    meta: [{ name: "description", content: "Set custom reminders" }],
                    reminders: [],
                    isGated: false,
                    daysLogged: 15,
                    phoneVerified: false,
                    phoneNumber: null
                }),
                HydrateFallback: () => null
            }
        ], {
            initialEntries: ["/dashboard/reminders"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /reminders/i });
        expect(screen.getByRole("heading", { level: 1, name: /reminders/i })).toBeInTheDocument();
    });

    it("should show gated state when user has insufficient days logged", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/reminders",
                element: <Reminders />,
                loader: async () => ({
                    title: "Reminders - NoBullFit",
                    meta: [{ name: "description", content: "Set custom reminders" }],
                    reminders: [],
                    isGated: true,
                    daysLogged: 3,
                    phoneVerified: false,
                    phoneNumber: null
                }),
                HydrateFallback: () => null
            }
        ], {
            initialEntries: ["/dashboard/reminders"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByText(/reminders unlock after 10 days of tracking/i);
        expect(screen.getByText(/you've logged 3 of 10 days/i)).toBeInTheDocument();
    });

    it("should show empty state when no reminders exist", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/reminders",
                element: <Reminders />,
                loader: async () => ({
                    title: "Reminders - NoBullFit",
                    meta: [{ name: "description", content: "Set custom reminders" }],
                    reminders: [],
                    isGated: false,
                    daysLogged: 15,
                    phoneVerified: false,
                    phoneNumber: null
                }),
                HydrateFallback: () => null
            }
        ], {
            initialEntries: ["/dashboard/reminders"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByText(/no reminders set/i);
        expect(screen.getByText(/create reminders to stay on track/i)).toBeInTheDocument();
    });

    it("should show reminders list when reminders exist", async () => {
        const mockReminders = [
            {
                id: 1,
                title: "Log your meals",
                message: "Remember to log your meals!",
                delivery_type: "email",
                schedule_type: "recurring",
                scheduled_at: null,
                recurrence_pattern: "daily",
                recurrence_days: null,
                recurrence_time: "09:00:00",
                timezone: "America/New_York",
                is_active: true,
                next_fire_at: "2026-03-01T14:00:00.000Z",
                last_fired_at: null,
                created_at: "2026-02-27T00:00:00.000Z",
                updated_at: "2026-02-27T00:00:00.000Z"
            }
        ];

        const router = createMemoryRouter([
            {
                path: "/dashboard/reminders",
                element: <Reminders />,
                loader: async () => ({
                    title: "Reminders - NoBullFit",
                    meta: [{ name: "description", content: "Set custom reminders" }],
                    reminders: mockReminders,
                    isGated: false,
                    daysLogged: 15,
                    phoneVerified: false,
                    phoneNumber: null
                }),
                HydrateFallback: () => null
            }
        ], {
            initialEntries: ["/dashboard/reminders"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByText("Log your meals");
        expect(screen.getByText("Log your meals")).toBeInTheDocument();
        expect(screen.getByText("Email")).toBeInTheDocument();
    });
});
