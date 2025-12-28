import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import About from "./About";
import aboutLoader from "@loaders/aboutLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("About", () => {
    it("should render the about page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/about",
                    element: <About />,
                    loader: aboutLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/about"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /About/i })).toBeInTheDocument();
    });
});
