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
