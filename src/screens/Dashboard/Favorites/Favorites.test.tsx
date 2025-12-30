import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Favorites from "./Favorites";

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

// Mock favorites data
const mockFavorites = [
    {
        id: 1,
        food_id: "food_123",
        food_label: "Apple",
        food_data: {
            brand: null,
            category: "Generic foods",
            categoryLabel: "food",
            image: "https://example.com/apple.jpg"
        },
        item_type: "food",
        created_at: "2025-01-01T00:00:00.000Z"
    },
    {
        id: 2,
        food_id: "42",
        food_label: "My Recipe",
        food_data: {
            image_filename: "my-recipe.jpg"
        },
        item_type: "recipe",
        created_at: "2025-01-02T00:00:00.000Z"
    }
];

describe("Favorites", () => {
    it("should render the favorites page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/favorites",
                element: <Favorites />,
                loader: async () => ({
                    title: "Favorites - NoBullFit",
                    meta: [{ name: "description", content: "Your favorite items" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/favorites"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete - use level to be specific
        await screen.findByRole("heading", { level: 1, name: /favorites/i });

        expect(screen.getByRole("heading", { level: 1, name: /favorites/i })).toBeInTheDocument();
        expect(screen.getByText(/your favorite items will appear here/i)).toBeInTheDocument();
    });
});
