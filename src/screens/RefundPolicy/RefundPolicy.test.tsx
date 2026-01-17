import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import RefundPolicy from "./RefundPolicy";
import refundPolicyLoader from "@loaders/refundPolicyLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("RefundPolicy", () => {
    it("should render the refund policy page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/refund-policy",
                    element: <RefundPolicy />,
                    loader: refundPolicyLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/refund-policy"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available - find the main h1 heading
        expect(await screen.findByRole("heading", { name: /Refund Policy/i, level: 1 })).toBeInTheDocument();
        // Check for key subscription-related content
        expect(screen.getByText(/Subscription Overview/i)).toBeInTheDocument();
    });
});
