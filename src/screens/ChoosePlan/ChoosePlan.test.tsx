import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ChoosePlan from "./ChoosePlan";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock the AuthContext
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        login: vi.fn(),
        user: null,
        isLoading: false
    })
}));

// Mock loader that returns basic data
const mockLoader = () => ({
    title: "Choose Your Plan - NoBullFit",
    meta: [],
    user: { id: 1, email: "test@example.com", full_name: "Test User", plan: null }
});

// Helper to render the ChoosePlan page with router
const renderChoosePlan = () => {
    const router = createMemoryRouter(
        [
            {
                path: "/choose-plan",
                element: <ChoosePlan />,
                loader: mockLoader,
                HydrateFallback: () => null
            }
        ],
        {
            initialEntries: ["/choose-plan"]
        }
    );

    return render(<RouterProvider router={router} />);
};

describe("ChoosePlan", () => {
    it("should render the welcome header", async () => {
        renderChoosePlan();
        
        expect(await screen.findByRole("heading", { name: /Welcome to NoBullFit!/i })).toBeInTheDocument();
    });

    it("should display the Free plan with features", async () => {
        renderChoosePlan();
        
        // Check for Free plan heading
        expect(await screen.findByRole("heading", { name: /^Free$/i })).toBeInTheDocument();
        
        // Check for $0 price
        expect(screen.getByText("$0")).toBeInTheDocument();
        expect(screen.getByText("/ forever")).toBeInTheDocument();
        
        // Check for Recommended badge
        expect(screen.getByText("Recommended")).toBeInTheDocument();
        
        // Check for some free features
        expect(screen.getByText(/Full food database with detailed nutrition data/i)).toBeInTheDocument();
        expect(screen.getByText(/No ads, ever/i)).toBeInTheDocument();
    });

    it("should display the Pro plan with pricing", async () => {
        renderChoosePlan();
        
        // Check for Pro plan heading
        expect(await screen.findByRole("heading", { name: /^Pro$/i })).toBeInTheDocument();
        
        // Check for Most Popular badge
        expect(screen.getByText("Most Popular")).toBeInTheDocument();
        
        // Check for $10 price
        expect(screen.getByText("$10")).toBeInTheDocument();
    });

    it("should have a Get Started button for Free plan", async () => {
        renderChoosePlan();
        
        const freeButton = await screen.findByRole("button", { name: /Get Started for Free/i });
        expect(freeButton).toBeInTheDocument();
        expect(freeButton).not.toBeDisabled();
    });

    it("should have a Subscribe to Pro button", async () => {
        renderChoosePlan();
        
        const proButton = await screen.findByRole("button", { name: /Subscribe to Pro/i });
        expect(proButton).toBeInTheDocument();
        // Button is disabled until Paddle.js loads
        expect(proButton).toBeDisabled();
    });

    it("should display the Why Free-First section", async () => {
        renderChoosePlan();
        
        expect(await screen.findByRole("heading", { name: /Why Free-First\?/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Privacy by Default/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /Full Data Control/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /No Paywalls/i })).toBeInTheDocument();
    });

    it("should display the Where Does the Money Go section", async () => {
        renderChoosePlan();
        
        expect(await screen.findByRole("heading", { name: /Where Does the Money Go\?/i })).toBeInTheDocument();
        expect(screen.getByText(/keeping NoBullFit online and ad-free/i)).toBeInTheDocument();
    });
});
