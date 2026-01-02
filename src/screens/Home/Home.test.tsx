import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Home from "./Home";
import homeLoader from "@loaders/homeLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("Home", () => {
    it("should render the home page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <Home />,
                    loader: homeLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(
            await screen.findByRole("heading", {
                name: /Track nutrition, recipes, and progress/i
            })
        ).toBeInTheDocument();
    });

    it("should render the Create a free account button", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <Home />,
                    loader: homeLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available - there are multiple CTAs on the page
        const links = await screen.findAllByRole("link", { name: /Create a free account/i });
        expect(links.length).toBeGreaterThan(0);
    });

    it("should render the View on GitHub link", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <Home />,
                    loader: homeLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        await screen.findByRole("heading", { name: /Track nutrition, recipes, and progress/i });
        
        // Check for View on GitHub link
        expect(screen.getByRole("link", { name: /View the code on GitHub/i })).toBeInTheDocument();
    });
});