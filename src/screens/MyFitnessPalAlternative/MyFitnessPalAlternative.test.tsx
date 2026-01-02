import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import MyFitnessPalAlternative from "./MyFitnessPalAlternative";
import myFitnessPalAlternativeLoader from "@loaders/myFitnessPalAlternativeLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("MyFitnessPalAlternative", () => {
    it("should render the MyFitnessPal alternative page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/myfitnesspal-alternative-without-ads-or-data-selling",
                    element: <MyFitnessPalAlternative />,
                    loader: myFitnessPalAlternativeLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/myfitnesspal-alternative-without-ads-or-data-selling"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(
            await screen.findByRole("heading", { name: /MyFitnessPal Alternative Without Ads or Data Selling/i })
        ).toBeInTheDocument();
    });
});
