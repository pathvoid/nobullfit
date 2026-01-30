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
        sessionStorage.clear();
    });

    it("should render the recipe database page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                hydrateFallbackElement: <div>Loading...</div>,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database"],
            future: {
                v7_partialHydration: true
            }
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
                HydrateFallback: () => null,
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

    it("should enable search button with less than 3 characters when myRecipes filter is active", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            // Start with myRecipes filter in URL (only myRecipes bypasses 3 char requirement)
            initialEntries: ["/dashboard/recipe-database?myRecipes=true"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Search button should be enabled even without search text because myRecipes is active
        await waitFor(() => {
            const searchButton = screen.getByRole("button", { name: /search/i });
            expect(searchButton).not.toBeDisabled();
        });
    });

    it("should keep search button disabled with less than 3 characters when only verified filter is active", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            // verified filter does NOT bypass the 3 character requirement
            initialEntries: ["/dashboard/recipe-database?verified=true"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Search button should be disabled because verified alone doesn't bypass 3 char requirement
        const searchButton = screen.getByRole("button", { name: /search/i });
        expect(searchButton).toBeDisabled();
    });

    it("should not submit search form when query is less than 3 characters and no filters", async () => {
        const fetchSpy = vi.spyOn(global, "fetch");
        fetchSpy.mockClear();

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

    it("should populate search input from URL but not auto-search", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Search input should be populated from URL
        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        expect(searchInput).toHaveValue("chicken");

        // But search should NOT auto-trigger - user must click Search button
        // Show the "Search for Recipes" empty state since no search has been performed
        expect(screen.getByRole("heading", { name: /search for recipes/i })).toBeInTheDocument();
    });

    it("should ignore search query in URL if less than 3 characters without filters", async () => {
        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

    it("should initialize filter state from URL params but not auto-search", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            // URL with filters but no search query meeting 3 char requirement
            initialEntries: ["/dashboard/recipe-database?verified=true&tags=breakfast,easy"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Should show the "Search for Recipes" prompt since no valid search criteria
        // (verified and tags don't bypass the 3 char requirement, only myRecipes does)
        expect(screen.getByRole("heading", { name: /search for recipes/i })).toBeInTheDocument();

        // Filter badges should be visible showing active filters (use getAllByText since "Verified" may appear multiple places)
        expect(screen.getAllByText(/verified/i).length).toBeGreaterThanOrEqual(1);
    });

    it("should filter out invalid tags from URL params", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Open filters to see tag buttons
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        // Valid tags should be selected (shown as active buttons)
        const breakfastTag = screen.getByRole("button", { name: /breakfast/i });
        const easyTag = screen.getByRole("button", { name: /easy/i });

        // These should have the selected styling (bg-blue-600)
        expect(breakfastTag).toHaveClass("bg-blue-600");
        expect(easyTag).toHaveClass("bg-blue-600");
    });

    it("should handle invalid page number in URL by defaulting to page 1", async () => {
        // Pre-populate sessionStorage with state that includes the page
        sessionStorage.setItem('recipeFilters', JSON.stringify({
            search: "chicken",
            tags: [],
            verified: false,
            myRecipes: false,
            page: 5 // This should be overridden by URL
        }));

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            // URL with invalid page number - should default to page 1
            initialEntries: ["/dashboard/recipe-database?q=chicken&page=-5"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Search input should have the query from URL
        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        expect(searchInput).toHaveValue("chicken");

        // The internal state should use page 1 (default for invalid page)
        // We can verify this by checking sessionStorage after a search triggers
        const searchButton = screen.getByRole("button", { name: /search/i });
        fireEvent.click(searchButton);

        await waitFor(() => {
            const stored = sessionStorage.getItem('recipeFilters');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.page).toBe(1);
        });
    });

    it("should populate search input from URL param", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

    it("should keep filters panel closed even when filter params are in URL", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Filters panel should NOT be visible by default (closed)
        expect(screen.queryByRole("heading", { name: /filters/i })).not.toBeInTheDocument();

        // But the active filter badge should be visible (use getAllByText since "Verified" may appear multiple places)
        expect(screen.getAllByText(/verified/i).length).toBeGreaterThanOrEqual(1);

        // Opening the filter panel should show the checkbox as checked
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        const verifiedCheckbox = screen.getByRole("checkbox", { name: /verified recipes only/i });
        expect(verifiedCheckbox).toBeChecked();
    });

    it("should save filter state to sessionStorage when filters change", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Open filters
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        // Check the verified checkbox
        const verifiedCheckbox = screen.getByRole("checkbox", { name: /verified recipes only/i });
        fireEvent.click(verifiedCheckbox);

        // Wait for sessionStorage to be updated
        await waitFor(() => {
            const stored = sessionStorage.getItem('recipeFilters');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.verified).toBe(true);
        });
    });

    it("should load filter state from sessionStorage on initial render and trigger search", async () => {
        // Pre-populate sessionStorage
        sessionStorage.setItem('recipeFilters', JSON.stringify({
            search: "chicken",
            tags: ["breakfast"],
            verified: true,
            myRecipes: false,
            page: 1
        }));

        const fetchSpy = createMockFetch();
        global.fetch = fetchSpy;

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Verify the search input has the stored value
        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        expect(searchInput).toHaveValue("chicken");

        // Filters panel should NOT be visible by default (stays closed)
        expect(screen.queryByRole("heading", { name: /filters/i })).not.toBeInTheDocument();

        // But filter badges should show active filters (use getAllByText since "Verified" may appear multiple places)
        expect(screen.getAllByText(/verified/i).length).toBeGreaterThanOrEqual(1);

        // Open filters to verify checkbox state
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        const verifiedCheckbox = screen.getByRole("checkbox", { name: /verified recipes only/i });
        expect(verifiedCheckbox).toBeChecked();

        // Verify API was called with stored filters (auto-search on restore)
        await waitFor(() => {
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("search=chicken"),
                expect.anything()
            );
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("verified=true"),
                expect.anything()
            );
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining("tags=breakfast"),
                expect.anything()
            );
        });
    });

    it("should prefer URL params over sessionStorage when URL params exist", async () => {
        // Pre-populate sessionStorage with different values than URL
        sessionStorage.setItem('recipeFilters', JSON.stringify({
            search: "pasta",
            tags: [],
            verified: false,
            myRecipes: false,
            page: 1
        }));

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Recipe Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search recipes" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            // URL has different search query
            initialEntries: ["/dashboard/recipe-database?q=chicken&verified=true"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /recipe database/i });

        // Should use URL params value when they exist (for SSR compatibility)
        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        expect(searchInput).toHaveValue("chicken");
    });

    it("should clear filters and reset sessionStorage when clearFilters is called", async () => {
        // Pre-populate sessionStorage
        sessionStorage.setItem('recipeFilters', JSON.stringify({
            search: "test",
            tags: ["breakfast"],
            verified: true,
            myRecipes: false,
            page: 1
        }));

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Wait for filters to be restored (check by badge visibility, use getAllByText since "Verified" may appear multiple places)
        await waitFor(() => {
            expect(screen.getAllByText(/verified/i).length).toBeGreaterThanOrEqual(1);
        });

        // Open filters panel to access Clear All button
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        // Click clear all button
        const clearButton = screen.getByRole("button", { name: /clear all/i });
        fireEvent.click(clearButton);

        // Search input should be empty
        const searchInput = screen.getByPlaceholderText(/search recipes/i);
        await waitFor(() => {
            expect(searchInput).toHaveValue("");
        });

        // Active filters should be gone (no "Verified" badge visible outside panel)
        expect(screen.queryByText(/^verified$/i)).not.toBeInTheDocument();
    });

    it("should update sessionStorage when tags are toggled", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Open filters
        const filterButton = screen.getByRole("button", { name: /filter/i });
        fireEvent.click(filterButton);

        // Click a tag button
        const breakfastTag = screen.getByRole("button", { name: /breakfast/i });
        fireEvent.click(breakfastTag);

        // Wait for sessionStorage to be updated
        await waitFor(() => {
            const stored = sessionStorage.getItem('recipeFilters');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.tags).toContain("breakfast");
        });
    });

    it("should update sessionStorage when performing a search", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <RecipeDatabase />,
                HydrateFallback: () => null,
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

        // Type a search query
        fireEvent.change(searchInput, { target: { value: "chicken soup" } });
        fireEvent.click(searchButton);

        // Wait for sessionStorage to be updated
        await waitFor(() => {
            const stored = sessionStorage.getItem('recipeFilters');
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.search).toBe("chicken soup");
        });
    });
});
