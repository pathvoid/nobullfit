import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import CreateRecipe from "./CreateRecipe";

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

// Mock RecipeMacrosInput
vi.mock("@core/components/RecipeMacrosInput", () => ({
    default: ({ macros, onChange }: { macros: unknown; onChange: (m: unknown) => void }) => (
        <div data-testid="recipe-macros-input">
            <button onClick={() => onChange({ calories: 250 })}>Set Macros</button>
        </div>
    )
}));

// Mock fetch
global.fetch = vi.fn();

describe("CreateRecipe", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ recipe: { id: 1 } })
        });
    });

    it("should render create recipe form", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            // Use heading role to be more specific since there's also a "Create Recipe" button
            expect(screen.getByRole("heading", { name: /Create Recipe/i })).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/Recipe Name/i)).toBeInTheDocument();
        // Use getByText for Description since the label may not be properly associated with a form control
        expect(screen.getByText(/Description/i)).toBeInTheDocument();
    });

    it("should render edit recipe form when in edit mode", async () => {
        const mockRecipe = {
            id: 1,
            name: "Test Recipe",
            description: "Test Description",
            ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
            steps: ["Step 1"],
            image_filename: null,
            macros: null,
            servings: 4,
            cooking_time_minutes: 30,
            tags: ["breakfast"],
            is_public: false,
            is_verified: false,
            favorite_count: 0
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ recipe: mockRecipe })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId/edit",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Edit Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1/edit"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Edit Recipe/i)).toBeInTheDocument();
        });

        await waitFor(() => {
            const nameInput = screen.getByLabelText(/Recipe Name/i) as HTMLInputElement;
            expect(nameInput.value).toBe("Test Recipe");
        });
    });

    it("should validate recipe name length", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Recipe Name/i)).toBeInTheDocument();
        });

        const nameInput = screen.getByLabelText(/Recipe Name/i);
        const longName = "a".repeat(101);
        fireEvent.change(nameInput, { target: { value: longName } });

        await waitFor(() => {
            expect(screen.getByText(/must be 100 characters or less/i)).toBeInTheDocument();
        });
    });

    it("should validate emoji in recipe name", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/Recipe Name/i)).toBeInTheDocument();
        });

        const nameInput = screen.getByLabelText(/Recipe Name/i);
        fireEvent.change(nameInput, { target: { value: "Recipe 😀" } });

        await waitFor(() => {
            expect(screen.getByText(/cannot contain emojis/i)).toBeInTheDocument();
        });
    });

    it("should allow adding ingredients", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Add Ingredient/i })).toBeInTheDocument();
        });

        const addButton = screen.getByRole("button", { name: /Add Ingredient/i });
        fireEvent.click(addButton);

        await waitFor(() => {
            const ingredientInputs = screen.getAllByPlaceholderText(/Ingredient name/i);
            expect(ingredientInputs.length).toBeGreaterThan(1);
        });
    });

    it("should allow adding steps", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Add Step/i })).toBeInTheDocument();
        });

        const addButton = screen.getByRole("button", { name: /Add Step/i });
        fireEvent.click(addButton);

        await waitFor(() => {
            const stepInputs = screen.getAllByPlaceholderText(/Step/i);
            expect(stepInputs.length).toBeGreaterThan(1);
        });
    });

    it("should show delete button in edit mode", async () => {
        const mockRecipe = {
            id: 1,
            name: "Test Recipe",
            description: "Test Description",
            ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
            steps: ["Step 1"],
            image_filename: null,
            macros: null,
            servings: null,
            cooking_time_minutes: null,
            tags: [],
            is_public: false,
            is_verified: false,
            favorite_count: 0
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ recipe: mockRecipe })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId/edit",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Edit Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1/edit"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Delete Recipe/i })).toBeInTheDocument();
        });
    });

    it("should open delete dialog when delete button is clicked", async () => {
        const mockRecipe = {
            id: 1,
            name: "Test Recipe",
            description: "Test Description",
            ingredients: [{ quantity: "1", unit: "cup", name: "flour" }],
            steps: ["Step 1"],
            image_filename: null,
            macros: null,
            servings: null,
            cooking_time_minutes: null,
            tags: [],
            is_public: true,
            is_verified: false,
            favorite_count: 5
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ recipe: mockRecipe })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/:recipeId/edit",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Edit Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/1/edit"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Delete Recipe/i })).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole("button", { name: /Delete Recipe/i });
        fireEvent.click(deleteButton);

        await waitFor(() => {
            // Multiple "Delete Recipe" texts exist after dialog opens (button, dialog title, submit button)
            expect(screen.getAllByText(/Delete Recipe/i).length).toBeGreaterThan(1);
            // Multiple elements contain "This action cannot be undone"
            expect(screen.getAllByText(/This action cannot be undone/i).length).toBeGreaterThan(0);
            expect(screen.getByText(/5 users who have favorited/i)).toBeInTheDocument();
        });
    });

    it("should display tags in collapsible sections", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Tags \(Optional\)/i)).toBeInTheDocument();
            expect(screen.getByText(/Meal Types/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("should allow selecting tags", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/recipe-database/create",
                element: <CreateRecipe />,
                loader: async () => ({
                    title: "Create Recipe - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/dashboard/recipe-database/create"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Meal Types/i)).toBeInTheDocument();
        });

        const mealTypesButton = screen.getByText(/Meal Types/i).closest("button");
        if (mealTypesButton) {
            fireEvent.click(mealTypesButton);
        }

        await waitFor(() => {
            expect(screen.getByText(/Breakfast/i)).toBeInTheDocument();
        });
    });
});

