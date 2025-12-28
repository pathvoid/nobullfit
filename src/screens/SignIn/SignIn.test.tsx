import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import SignIn from "./SignIn";
import signInLoader from "@loaders/signInLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock AuthContext
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        user: null,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkAuth: vi.fn()
    })
}));

describe("SignIn", () => {
    it("should render the sign in page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-in",
                    element: <SignIn />,
                    loader: signInLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-in"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Sign in to your account/i })).toBeInTheDocument();
    });

    it("should render the email input field", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-in",
                    element: <SignIn />,
                    loader: signInLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-in"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Sign in to your account/i });
        
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    it("should render the password input field", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-in",
                    element: <SignIn />,
                    loader: signInLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-in"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Sign in to your account/i });
        
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    });

    it("should render the sign in button", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-in",
                    element: <SignIn />,
                    loader: signInLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-in"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Sign in to your account/i });
        
        expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    });

    it("should render the sign up link", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-in",
                    element: <SignIn />,
                    loader: signInLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-in"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Sign in to your account/i });
        
        expect(screen.getByRole("link", { name: /Sign up/i })).toBeInTheDocument();
    });
});
