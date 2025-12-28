import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import PrivacyPolicy from "./PrivacyPolicy";
import privacyPolicyLoader from "@loaders/privacyPolicyLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("PrivacyPolicy", () => {
    it("should render the privacy policy page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/privacy-policy",
                    element: <PrivacyPolicy />,
                    loader: privacyPolicyLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/privacy-policy"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Privacy Policy/i })).toBeInTheDocument();
    });
});
