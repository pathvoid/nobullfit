import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ProgressTracking from "./ProgressTracking";

// Mock useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock AuthContext
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        user: { id: 1, email: "test@example.com", full_name: "Test User" },
        isLoading: false
    })
}));

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe("ProgressTracking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ activities: [] })
        });
    });

    it("should render the progress tracking page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/progress-tracking",
                element: <ProgressTracking />,
                loader: async () => ({
                    title: "Progress Tracking - NoBullFit",
                    meta: [{ name: "description", content: "Track your health and fitness progress over time" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    initialActivities: [],
                    initialDate: null,
                    initialTimezone: null
                })
            }
        ], {
            initialEntries: ["/dashboard/progress-tracking"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /progress tracking/i });

        expect(screen.getByRole("heading", { name: /progress tracking/i })).toBeInTheDocument();
        expect(screen.getByText(/track your health and fitness progress over time/i)).toBeInTheDocument();
    });

    it("should display date navigation controls", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/progress-tracking",
                element: <ProgressTracking />,
                loader: async () => ({
                    title: "Progress Tracking - NoBullFit",
                    meta: [{ name: "description", content: "Track your health and fitness progress over time" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    initialActivities: [],
                    initialDate: null,
                    initialTimezone: null
                })
            }
        ], {
            initialEntries: ["/dashboard/progress-tracking"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /progress tracking/i });

        // Check for date input
        const dateInput = screen.getByLabelText(/date/i) || screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
        expect(dateInput).toBeInTheDocument();
    });
});
