import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import TrackMacrosWithRecipes from "./TrackMacrosWithRecipes";
import trackMacrosWithRecipesLoader from "@loaders/trackMacrosWithRecipesLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("TrackMacrosWithRecipes", () => {
    it("should render the Track macros with recipes page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/track-macros-with-recipes",
                    element: <TrackMacrosWithRecipes />,
                    loader: trackMacrosWithRecipesLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/track-macros-with-recipes"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /How to Track Macros When You Cook \(Recipes \+ Food Diary\)/i })).toBeInTheDocument();
    });
});
