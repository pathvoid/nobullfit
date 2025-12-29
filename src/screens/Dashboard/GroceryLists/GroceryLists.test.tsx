import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import GroceryLists from "./GroceryLists";

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

describe("GroceryLists", () => {
    it("should render the grocery lists page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/grocery-lists",
                element: <GroceryLists />,
                loader: async () => ({
                    title: "Grocery Lists - NoBullFit",
                    meta: [{ name: "description", content: "Create and manage your grocery lists" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/grocery-lists"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete - use level to be specific
        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        expect(screen.getByRole("heading", { level: 1, name: /grocery lists/i })).toBeInTheDocument();
        expect(screen.getByText(/create and manage your grocery lists/i)).toBeInTheDocument();
    });
});
