import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RecipeDatabase from "./RecipeDatabase";

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
        user: { id: 1, email: "test@example.com", full_name: "Test User" },
        isLoading: false
    })
}));

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

// Mock fetch for recipe API calls
const mockRecipes = [
    {
        id: 1,
        name: "Test Recipe",
        description: "A test recipe description",
        image_filename: "test-image.jpg",
        tags: ["breakfast", "easy"],
        is_public: true,
        is_verified: true,
        author_name: "Test User",
        user_id: 1,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z"
    },
    {
        id: 2,
        name: "Recipe Without Image",
        description: "Another recipe",
        image_filename: null,
        tags: [],
        is_public: true,
        is_verified: false,
        author_name: "Other User",
        user_id: 2,
        created_at: "2025-01-02T00:00:00.000Z",
        updated_at: "2025-01-02T00:00:00.000Z"
    }
];

global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            recipes: mockRecipes,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        })
    })
) as unknown as typeof fetch;

describe("RecipeDatabase", () => {
    it("should render the recipe database page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /recipe database/i });

        expect(screen.getByRole("heading", { name: /recipe database/i })).toBeInTheDocument();
        expect(screen.getByText(/browse and search recipes/i)).toBeInTheDocument();
    });

    it("should disable search button when search query is less than 3 characters", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        const searchButton = screen.getByRole("button", { name: /search/i });

        // Initially disabled (empty search)
        expect(searchButton).toBeDisabled();

        // Type 1 character - still disabled
        fireEvent.change(searchInput, { target: { value: "a" } });
        expect(searchButton).toBeDisabled();

        // Type 2 characters - still disabled
        fireEvent.change(searchInput, { target: { value: "ab" } });
        expect(searchButton).toBeDisabled();

        // Type 3 characters - now enabled
        fireEvent.change(searchInput, { target: { value: "abc" } });
        expect(searchButton).not.toBeDisabled();
    });

    it("should enable search button with less than 3 characters when filters are active", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Initially disabled
        expect(screen.getByRole("button", { name: /search/i })).toBeDisabled();

        // Open filters
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        // Toggle "Verified recipes only" filter by clicking the checkbox
        const verifiedCheckbox = await screen.findByRole("checkbox", { name: /verified recipes only/i });
        fireEvent.click(verifiedCheckbox);

        // Search button should now be enabled even without search text
        // Re-query the button to get the updated state
        await screen.findByRole("button", { name: /search/i }).then((button) => {
            expect(button).not.toBeDisabled();
        });
    });

    it("should not submit search form when query is less than 3 characters and no filters", async () => {
        const fetchSpy = vi.spyOn(global, "fetch");
        fetchSpy.mockClear();

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        const searchInput = screen.getByPlaceholderText(/search recipes/i);

        // Type 2 characters and try to submit via Enter
        fireEvent.change(searchInput, { target: { value: "ab" } });
        fireEvent.submit(searchInput.closest("form")!);

        // Fetch should not have been called for recipe search
        expect(fetchSpy).not.toHaveBeenCalledWith(
            expect.stringContaining("/api/recipes/search"),
            expect.anything()
        );
    });
});
