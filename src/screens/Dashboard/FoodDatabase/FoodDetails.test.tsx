import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import FoodDetails from "./FoodDetails";

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

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("FoodDetails", () => {
    const mockFoodData = {
        food: {
            foodId: "3017620422003",
            label: "Apple",
            knownAs: "Fresh Apple",
            brand: "Local Farm",
            category: "fruits",
            categoryLabel: "Fruits",
            nutrients: {
                ENERC_KCAL: 52,
                PROCNT: 0.3,
                FAT: 0.2,
                CHOCDF: 14,
                FIBTG: 2.4,
                SUGAR: 10
            },
            measures: [
                { uri: "off://serving", label: "Serving", weight: 182 },
                { uri: "off://gram", label: "Gram", weight: 1 }
            ]
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
        // Default mock for favorites check
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ isFavorite: false })
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should render food details page with food data", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [{ name: "description", content: "Food details" }],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /apple/i });

        expect(screen.getByRole("heading", { name: /apple/i })).toBeInTheDocument();
        expect(screen.getByText(/fresh apple/i)).toBeInTheDocument();
    });

    it("should show error when food is not found", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Food Details - NoBullFit",
                    meta: [],
                    error: "Food not found"
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/unknown_food"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/food not found/i)).toBeInTheDocument();
        });
    });

    it("should display nutritional information", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByText(/nutritional information/i);

        expect(screen.getByText(/calories/i)).toBeInTheDocument();
        expect(screen.getByText(/protein/i)).toBeInTheDocument();
        expect(screen.getByText(/carbohydrates/i)).toBeInTheDocument();
        expect(screen.getByText(/fat/i)).toBeInTheDocument();
    });

    it("should display basic information", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByText(/basic information/i);

        expect(screen.getByText(/brand/i)).toBeInTheDocument();
        expect(screen.getByText(/local farm/i)).toBeInTheDocument();
    });

    it("should show add to favorites button when not favorited", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ isFavorite: false })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /add to favorites/i })).toBeInTheDocument();
        });
    });

    it("should show remove from favorites button when favorited", async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ isFavorite: true })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /remove from favorites/i })).toBeInTheDocument();
        });
    });

    it("should show back to search button", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /back to search/i })).toBeInTheDocument();
        });
    });

    it("should open add to grocery list dialog when clicking more actions", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ lists: [] })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("button", { name: /more actions/i });

        // Click the More Actions dropdown
        fireEvent.click(screen.getByRole("button", { name: /more actions/i }));

        // Click Add to Grocery List option
        await waitFor(() => {
            expect(screen.getByText(/add to grocery list/i)).toBeInTheDocument();
        });
    });

    it("should display fiber and sugar if available", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database/:foodId",
                element: <FoodDetails />,
                loader: async () => ({
                    title: "Apple - NoBullFit",
                    meta: [],
                    foodData: mockFoodData
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database/3017620422003"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/fiber/i)).toBeInTheDocument();
            expect(screen.getByText(/sugar/i)).toBeInTheDocument();
        });
    });
});
