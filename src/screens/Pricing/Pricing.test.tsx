import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Pricing from "./Pricing";
import pricingLoader from "@loaders/pricingLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Helper to render the Pricing page with router
const renderPricing = () => {
    const router = createMemoryRouter(
        [
            {
                path: "/pricing",
                element: <Pricing />,
                loader: pricingLoader,
                HydrateFallback: () => null
            }
        ],
        {
            initialEntries: ["/pricing"]
        }
    );

    return render(<RouterProvider router={router} />);
};

describe("Pricing", () => {
    it("should render the pricing page header", async () => {
        renderPricing();
        
        expect(await screen.findByRole("heading", { name: /Simple, Honest Pricing/i })).toBeInTheDocument();
    });

    it("should display the Free plan with features", async () => {
        renderPricing();
        
        // Check for Free plan heading
        expect(await screen.findByRole("heading", { name: /^Free$/i })).toBeInTheDocument();
        
        // Check for $0 price
        expect(screen.getByText("$0")).toBeInTheDocument();
        expect(screen.getByText("/ forever")).toBeInTheDocument();
        
        // Check for some free features
        expect(screen.getByText(/Full food database with detailed nutrition data/i)).toBeInTheDocument();
        expect(screen.getByText(/Unlimited daily food tracking/i)).toBeInTheDocument();
        expect(screen.getByText(/No ads, ever/i)).toBeInTheDocument();
    });

    it("should display the Pro plan as coming soon", async () => {
        renderPricing();
        
        // Check for Pro plan heading
        expect(await screen.findByRole("heading", { name: /^Pro$/i })).toBeInTheDocument();
        
        // Check for Coming Soon badge
        expect(screen.getByText("Coming Soon")).toBeInTheDocument();
        
        // Check for TBD price
        expect(screen.getByText("TBD")).toBeInTheDocument();
        
        // Check for Pro features
        expect(screen.getByText(/Plan meals for future days and weeks/i)).toBeInTheDocument();
        expect(screen.getByText(/Copy entire days or weeks of meals/i)).toBeInTheDocument();
    });

    it("should display the Why Free-First section", async () => {
        renderPricing();
        
        expect(await screen.findByRole("heading", { name: /Why Free-First\?/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Privacy by Default/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Full Data Control/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /No Paywalls/i })).toBeInTheDocument();
    });

    it("should display the Where Does the Money Go section", async () => {
        renderPricing();
        
        expect(await screen.findByRole("heading", { name: /Where Does the Money Go\?/i })).toBeInTheDocument();
        expect(screen.getByText(/keeping NoBullFit online and ad-free/i)).toBeInTheDocument();
    });

    it("should display the comparison table", async () => {
        renderPricing();
        
        expect(await screen.findByRole("heading", { name: /How We Compare/i })).toBeInTheDocument();
        
        // Check for table headers
        expect(screen.getByRole("columnheader", { name: /Feature/i })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: /NoBullFit/i })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: /MyFitnessPal/i })).toBeInTheDocument();
        
        // Check for some table content
        expect(screen.getByRole("cell", { name: /Free tier/i })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: /No ads/i })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: /Source-available/i })).toBeInTheDocument();
    });

    it("should display the call to action", async () => {
        renderPricing();
        
        expect(await screen.findByRole("heading", { name: /Ready to Start\?/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Create Free Account/i })).toHaveAttribute("href", "/sign-up");
    });
});
