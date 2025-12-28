import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import TermsOfService from "./TermsOfService";
import termsOfServiceLoader from "@loaders/termsOfServiceLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("TermsOfService", () => {
    it("should render the terms of service page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/terms-of-service",
                    element: <TermsOfService />,
                    loader: termsOfServiceLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/terms-of-service"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Terms of Service/i })).toBeInTheDocument();
    });
});
