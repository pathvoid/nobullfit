import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Contact from "./Contact";
import contactLoader from "@loaders/contactLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("Contact", () => {
    it("should render the contact page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/contact",
                    element: <Contact />,
                    loader: contactLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/contact"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Contact Us/i })).toBeInTheDocument();
    });
});
