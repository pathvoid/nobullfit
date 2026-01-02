import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import SourceAvailableVsOpenSourceHealthApps from "./SourceAvailableVsOpenSourceHealthApps";
import sourceAvailableVsOpenSourceHealthAppsLoader from "@loaders/sourceAvailableVsOpenSourceHealthAppsLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("SourceAvailableVsOpenSourceHealthApps", () => {
    it("should render the source-available vs open source page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/source-available-vs-open-source-for-health-apps",
                    element: <SourceAvailableVsOpenSourceHealthApps />,
                    loader: sourceAvailableVsOpenSourceHealthAppsLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/source-available-vs-open-source-for-health-apps"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(
            await screen.findByRole("heading", { name: /Source-Available vs Open Source for Health Apps \(Why It Matters\)/i })
        ).toBeInTheDocument();
    });
});
