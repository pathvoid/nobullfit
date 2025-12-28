import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import SignUp from "./SignUp";
import signUpLoader from "@loaders/signUpLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("SignUp", () => {
    it("should render the sign up page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-up",
                    element: <SignUp />,
                    loader: signUpLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-up"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Create your account/i })).toBeInTheDocument();
    });

    it("should render the email input field", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-up",
                    element: <SignUp />,
                    loader: signUpLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-up"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Create your account/i });
        
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });

    it("should render the full name input field", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-up",
                    element: <SignUp />,
                    loader: signUpLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-up"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Create your account/i });
        
        expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    });

    it("should render the password input field", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-up",
                    element: <SignUp />,
                    loader: signUpLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-up"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Create your account/i });
        
        // Use exact label text to target the password field (not Confirm Password)
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render the create account button", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-up",
                    element: <SignUp />,
                    loader: signUpLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-up"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Create your account/i });
        
        expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
    });

    it("should render the sign in link", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/sign-up",
                    element: <SignUp />,
                    loader: signUpLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/sign-up"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Create your account/i });
        
        expect(screen.getByRole("link", { name: /Sign in/i })).toBeInTheDocument();
    });
});
