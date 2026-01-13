import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import FoodTracking from "./FoodTracking";

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

// Helper to create router with loader data
const createFoodTrackingRouter = (userData: { subscribed?: boolean } = {}) => {
    return createMemoryRouter([
        {
            path: "/dashboard/food-tracking",
            element: <FoodTracking />,
            loader: async () => ({
                title: "Food Tracking - NoBullFit",
                meta: [{ name: "description", content: "Track your daily food intake and nutrition" }],
                user: { 
                    id: 1, 
                    email: "test@example.com", 
                    full_name: "Test User",
                    subscribed: userData.subscribed ?? false
                },
                initialFoods: [],
                initialDate: null,
                initialTimezone: null
            })
        }
    ], {
        initialEntries: ["/dashboard/food-tracking"]
    });
};

describe("FoodTracking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ foods: [] })
        });
    });

    it("should render the food tracking page", async () => {
        const router = createFoodTrackingRouter();
        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /food tracking/i });

        expect(screen.getByRole("heading", { name: /food tracking/i })).toBeInTheDocument();
        expect(screen.getByText(/track your daily food intake and nutrition/i)).toBeInTheDocument();
    });

    it("should display date navigation controls", async () => {
        const router = createFoodTrackingRouter();
        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /food tracking/i });

        // Check for date input
        const dateInput = screen.getByLabelText(/date/i) || screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
        expect(dateInput).toBeInTheDocument();
    });

    describe("Free User Features", () => {
        it("should not show Copy Day/Paste Day buttons for free users", async () => {
            const router = createFoodTrackingRouter({ subscribed: false });
            render(<RouterProvider router={router} />);

            await screen.findByRole("heading", { name: /food tracking/i });

            // Copy Day button should not be present for free users
            expect(screen.queryByRole("button", { name: /copy day/i })).not.toBeInTheDocument();
        });

        it("should not show Copy Week button for free users", async () => {
            const router = createFoodTrackingRouter({ subscribed: false });
            render(<RouterProvider router={router} />);

            await screen.findByRole("heading", { name: /food tracking/i });

            // Copy Week button should not be present for free users
            expect(screen.queryByRole("button", { name: /copy week/i })).not.toBeInTheDocument();
        });
    });

    describe("Pro User Features", () => {
        it("should show Copy Day button for pro users", async () => {
            const router = createFoodTrackingRouter({ subscribed: true });
            render(<RouterProvider router={router} />);

            await screen.findByRole("heading", { name: /food tracking/i });

            // Copy Day button should be present for pro users
            expect(screen.getByRole("button", { name: /copy day/i })).toBeInTheDocument();
        });

        it("should show Paste Day button for pro users", async () => {
            const router = createFoodTrackingRouter({ subscribed: true });
            render(<RouterProvider router={router} />);

            await screen.findByRole("heading", { name: /food tracking/i });

            // Paste Day button should be present for pro users
            expect(screen.getByRole("button", { name: /paste day/i })).toBeInTheDocument();
        });

        it("should show Copy Week button for pro users", async () => {
            const router = createFoodTrackingRouter({ subscribed: true });
            render(<RouterProvider router={router} />);

            await screen.findByRole("heading", { name: /food tracking/i });

            // Copy Week button should be present for pro users
            expect(screen.getByRole("button", { name: /copy week/i })).toBeInTheDocument();
        });
    });
});
