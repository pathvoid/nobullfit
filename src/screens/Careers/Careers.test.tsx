import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Careers from "./Careers";
import careersLoader from "@loaders/careersLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("Careers", () => {
    it("should render the careers page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/careers",
                    element: <Careers />,
                    loader: careersLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/careers"]
            }
        );

        render(<RouterProvider router={router} />);

        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Careers/i })).toBeInTheDocument();
    });

    it("should display no open positions message", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/careers",
                    element: <Careers />,
                    loader: careersLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/careers"]
            }
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByText(/No Open Positions/i)).toBeInTheDocument();
    });

    it("should render company values section", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/careers",
                    element: <Careers />,
                    loader: careersLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/careers"]
            }
        );

        render(<RouterProvider router={router} />);

        expect(await screen.findByText(/Privacy First/i)).toBeInTheDocument();
        expect(await screen.findByText(/Transparency/i)).toBeInTheDocument();
        expect(await screen.findByText(/User-Centric Design/i)).toBeInTheDocument();
        expect(await screen.findByText(/Continuous Learning/i)).toBeInTheDocument();
    });
});
