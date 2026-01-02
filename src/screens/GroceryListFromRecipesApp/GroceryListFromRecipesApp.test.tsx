import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import GroceryListFromRecipesApp from "./GroceryListFromRecipesApp";
import groceryListFromRecipesAppLoader from "@loaders/groceryListFromRecipesAppLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("GroceryListFromRecipesApp", () => {
    it("should render the grocery list from recipes app page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/grocery-list-from-recipes-app",
                    element: <GroceryListFromRecipesApp />,
                    loader: groceryListFromRecipesAppLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/grocery-list-from-recipes-app"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Build a Grocery List From Recipes \(Meal Prep Without Friction\)/i })).toBeInTheDocument();
    });
});
