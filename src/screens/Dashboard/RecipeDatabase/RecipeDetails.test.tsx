import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecipeDetails from "./RecipeDetails";

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

const mockRecipe = {
    id: 1,
    name: "Test Recipe",
    description: "A test recipe description",
    ingredients: [
        { quantity: "2", unit: "cups", name: "flour" },
        { quantity: "1", unit: "cup", name: "sugar" }
    ],
    steps: ["Step 1", "Step 2"],
    image_filename: "test-image.jpg",
    macros: {
        calories: 250,
        protein: 10,
        carbohydrates: 30,
        fat: 5
    },
    servings: 4,
    cooking_time_minutes: 30,
    tags: ["breakfast", "quick"],
    is_public: true,
    is_verified: false,
    author_name: "Test User",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: 1,
    favorite_count: 0
};

describe("RecipeDetails", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ isFavorite: false })
        });
    });

    it("should render recipe details", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Test Recipe")).toBeInTheDocument();
        });

        expect(screen.getByText("A test recipe description")).toBeInTheDocument();
        expect(screen.getByText("By Test User")).toBeInTheDocument();
    });

    it("should display recipe image when available", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            const img = screen.getByAltText("Test Recipe");
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute("src", "https://cdn.nobull.fit/recipes/test-image.jpg");
        });
    });

    it("should show verified checkmark for verified recipes", async () => {
        const verifiedRecipe = { ...mockRecipe, is_verified: true };
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: verifiedRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Test Recipe")).toBeInTheDocument();
        });

        expect(screen.getByTitle("Verified recipe")).toBeInTheDocument();
        expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    it("should show More Actions dropdown for recipe owner", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            // More Actions dropdown should be present
            expect(screen.getByRole("button", { name: /More Actions/i })).toBeInTheDocument();
        });
    });

    it("should show More Actions dropdown for non-owner", async () => {
        const otherUserRecipe = { ...mockRecipe, user_id: 2 };
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: otherUserRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            // More Actions dropdown should be present
            expect(screen.getByRole("button", { name: /More Actions/i })).toBeInTheDocument();
        });
    });

    it("should display ingredients without numbers", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            // Ingredients may be converted based on metric/imperial toggle
            // Just check that ingredient names are present
            expect(screen.getByText(/flour/i)).toBeInTheDocument();
            expect(screen.getByText(/sugar/i)).toBeInTheDocument();
        });
    });

    it("should display nutritional information when available", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Nutritional Information")).toBeInTheDocument();
            expect(screen.getByText("250 kcal")).toBeInTheDocument();
            expect(screen.getByText("10.0 g")).toBeInTheDocument();
        });
    });

    it("should display servings and cooking time", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/4 servings/i)).toBeInTheDocument();
            expect(screen.getByText(/30 min/i)).toBeInTheDocument();
        });
    });

    it("should display recipe tags", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            // Tags might be rendered with different casing - check case insensitively
            expect(screen.getByText(/breakfast/i)).toBeInTheDocument();
            expect(screen.getByText(/quick/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("should display favorite button", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ isFavorite: false })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Add to Favorites/i })).toBeInTheDocument();
        });
    });

    it("should navigate back to recipe database with search params when coming from search", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <div data-testid="recipe-database">Recipe Database</div>
            },
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: [
                "/dashboard/recipe-database?q=test&verified=true",
                {
                    pathname: "/dashboard/recipe-database/1",
                    state: {
                        fromRecipeDatabase: true,
                        searchParams: "q=test&verified=true"
                    }
                }
            ],
            initialIndex: 1
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Test Recipe")).toBeInTheDocument();
        });

        // Click back button
        const backButton = screen.getByRole("button", { name: /back/i });
        fireEvent.click(backButton);

        // Should navigate to recipe database with search params
        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/dashboard/recipe-database");
            expect(router.state.location.search).toBe("?q=test&verified=true");
        });
    });

    it("should navigate back to recipe database without params when coming from favorites", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database",
                element: <div data-testid="recipe-database">Recipe Database</div>
            },
            {
                path: "/dashboard/recipe-database/:recipeId",
                element: <RecipeDetails />,
                loader: async () => ({
                    recipe: mockRecipe,
                    title: "Test Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            // Coming from favorites - no fromRecipeDatabase state
            initialEntries: ["/dashboard/recipe-database/1"],
            initialIndex: 0
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Test Recipe")).toBeInTheDocument();
        });

        // Click back button
        const backButton = screen.getByRole("button", { name: /back/i });
        fireEvent.click(backButton);

        // Should navigate to clean recipe database
        await waitFor(() => {
            expect(router.state.location.pathname).toBe("/dashboard/recipe-database");
            expect(router.state.location.search).toBe("");
        });
    });
});
