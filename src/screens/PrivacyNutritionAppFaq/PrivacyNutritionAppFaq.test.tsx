import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import PrivacyNutritionAppFaq from "./PrivacyNutritionAppFaq";
import privacyNutritionAppFaqLoader from "@loaders/privacyNutritionAppFaqLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("PrivacyNutritionAppFaq", () => {
    it("should render the privacy nutrition app FAQ page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/privacy-nutrition-app-faq",
                    element: <PrivacyNutritionAppFaq />,
                    loader: privacyNutritionAppFaqLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/privacy-nutrition-app-faq"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Privacy FAQ for Nutrition Apps \(What You Should Expect\)/i })).toBeInTheDocument();
    });
});
