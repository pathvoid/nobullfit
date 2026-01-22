import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const createMockFetch = () => vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            recipes: mockRecipes,
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
        })
    })
) as unknown as typeof fetch;

describe("RecipeDatabase", () => {
    beforeEach(() => {
        global.fetch = createMockFetch();
    });

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

    it("should enable search button with less than 3 characters when filters are active via URL", async () => {
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
            // Start with verified filter in URL
            initialEntries: ["/dashboard/recipe-database?verified=true"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Search button should be enabled even without search text because filter is active
        // Wait for the button state to update based on URL params
        await waitFor(() => {
            const searchButton = screen.getByRole("button", { name: /search/i });
            expect(searchButton).not.toBeDisabled();
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
            expect.stringContaining("/api/recipes?"),
            expect.anything()
        );
    });

    it("should load recipes when URL has valid search query", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

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
            // URL with valid search query (3+ characters)
            initialEntries: ["/dashboard/recipe-database?q=chicken"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Wait for fetch to be called with search param
        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("search=chicken"),
                expect.anything()
            );
        });
    });

    it("should ignore search query in URL if less than 3 characters without filters", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

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
            // URL with invalid search query (less than 3 characters)
            initialEntries: ["/dashboard/recipe-database?q=ab"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Should show the "Search for Recipes" prompt instead of loading recipes
        expect(screen.getByRole("heading", { name: /search for recipes/i })).toBeInTheDocument();
    });

    it("should load recipes with filters from URL params", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

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
            // URL with filters
            initialEntries: ["/dashboard/recipe-database?verified=true&tags=breakfast,easy"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Wait for fetch to be called with filter params (tags are URL-encoded, comma becomes %2C)
        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("tags=breakfast%2Ceasy"),
                expect.anything()
            );
        });
    });

    it("should ignore invalid tags in URL params", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

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
            // URL with mix of valid and invalid tags
            initialEntries: ["/dashboard/recipe-database?tags=breakfast,invalidtag123,easy"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Wait for fetch to be called - should only include valid tags
        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("tags=breakfast%2Ceasy"),
                expect.anything()
            );
        });
    });

    it("should handle invalid page number in URL by defaulting to page 1", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

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
            // URL with invalid page number and valid search
            initialEntries: ["/dashboard/recipe-database?q=chicken&page=-5"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Wait for fetch to be called with page=1 (default)
        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("page=1"),
                expect.anything()
            );
        });
    });

    it("should populate search input from URL param", async () => {
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
            initialEntries: ["/dashboard/recipe-database?q=pasta"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        expect(searchInput).toHaveValue("pasta");
    });

    it("should show filters panel when filter params are in URL", async () => {
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
            initialEntries: ["/dashboard/recipe-database?verified=true"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Filters panel should be visible
        expect(screen.getByRole("heading", { name: /filters/i })).toBeInTheDocument();

        // Verified checkbox should be checked
        const verifiedCheckbox = screen.getByRole("checkbox", { name: /verified recipes only/i });
        expect(verifiedCheckbox).toBeChecked();
    });
});
