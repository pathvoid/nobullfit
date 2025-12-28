import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import FoodDatabase from "./FoodDatabase";

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

describe("FoodDatabase", () => {
    it("should render the food database page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database",
                element: <FoodDatabase />,
                loader: async () => ({
                    title: "Food Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search the food database" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /food database/i });

        expect(screen.getByRole("heading", { name: /food database/i })).toBeInTheDocument();
        expect(screen.getByText(/browse and search the food database/i)).toBeInTheDocument();
    });
});
