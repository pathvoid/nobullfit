import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import FoodDatabase from "./FoodDatabase";

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

// Mock fetch for food API calls
const mockFoodHints = [
    {
        food: {
            foodId: "food_123",
            label: "Apple",
            knownAs: "Red Apple",
            nutrients: {
                ENERC_KCAL: 52,
                PROCNT: 0.3,
                FAT: 0.2,
                CHOCDF: 14
            },
            brand: null,
            category: "Generic foods",
            categoryLabel: "food",
            image: "https://example.com/apple.jpg"
        },
        measures: [{ uri: "measure_1", label: "Whole", weight: 182 }]
    },
    {
        food: {
            foodId: "food_456",
            label: "Chicken Breast",
            knownAs: null,
            nutrients: {
                ENERC_KCAL: 165,
                PROCNT: 31,
                FAT: 3.6,
                CHOCDF: 0
            },
            brand: "Tyson",
            category: "Generic foods",
            categoryLabel: "food",
            image: null
        },
        measures: [{ uri: "measure_2", label: "Serving", weight: 100 }]
    }
];

global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
            text: "test",
            count: 2,
            parsed: [],
            hints: mockFoodHints
        })
    })
) as unknown as typeof fetch;

describe("FoodDatabase", () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.clearAllMocks();
    });

    it("should render the food database page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database",
                element: <FoodDatabase />,
                HydrateFallback: () => null,
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

    it("should disable search button when search query is less than 3 characters", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database",
                element: <FoodDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Food Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search the food database" }]
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /food database/i });

        const searchInput = screen.getByPlaceholderText(/search for food/i);
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

    it("should save search state to sessionStorage after search", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database",
                element: <FoodDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Food Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search the food database" }]
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /food database/i });

        const searchInput = screen.getByPlaceholderText(/search for food/i);
        const searchButton = screen.getByRole("button", { name: /search/i });

        // Perform a search
        fireEvent.change(searchInput, { target: { value: "apple" } });
        fireEvent.click(searchButton);

        // Wait for sessionStorage to be updated
        await waitFor(() => {
            const stored = sessionStorage.getItem("foodSearchState");
            expect(stored).toBeTruthy();
            const parsed = JSON.parse(stored!);
            expect(parsed.searchQuery).toBe("apple");
            expect(parsed.originalQuery).toBe("apple");
        });
    });

    it("should restore search state from sessionStorage on initial render", async () => {
        // Pre-populate sessionStorage
        sessionStorage.setItem("foodSearchState", JSON.stringify({
            searchQuery: "banana",
            originalQuery: "banana",
            currentPage: 1,
            totalCount: 10,
            nextUrl: null
        }));

        const router = createMemoryRouter([
            {
                path: "/dashboard/food-database",
                element: <FoodDatabase />,
                HydrateFallback: () => null,
                loader: async () => ({
                    title: "Food Database - NoBullFit",
                    meta: [{ name: "description", content: "Browse and search the food database" }]
                })
            }
        ], {
            initialEntries: ["/dashboard/food-database"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /food database/i });

        // Verify the search input has the stored value
        const searchInput = screen.getByPlaceholderText(/search for food/i);
        expect(searchInput).toHaveValue("banana");

        // Search should auto-trigger with restored query
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
            const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
            const hasCorrectCall = calls.some((call: unknown[]) =>
                typeof call[0] === 'string' && call[0].includes("query=banana")
            );
            expect(hasCorrectCall).toBe(true);
        });
    });
});
