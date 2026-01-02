import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import PrivacyFirstCalorieTracker from "./PrivacyFirstCalorieTracker";
import privacyFirstCalorieTrackerLoader from "@loaders/privacyFirstCalorieTrackerLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("PrivacyFirstCalorieTracker", () => {
    it("should render the privacy-first calorie tracker page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/privacy-first-calorie-tracker",
                    element: <PrivacyFirstCalorieTracker />,
                    loader: privacyFirstCalorieTrackerLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/privacy-first-calorie-tracker"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Privacy-First Calorie Tracker App \(No Ads, No Tracking\)/i })).toBeInTheDocument();
    });
});
