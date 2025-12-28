import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ForgotPassword from "./ForgotPassword";
import forgotPasswordLoader from "@loaders/forgotPasswordLoader";

// Mock the useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

describe("ForgotPassword", () => {
    it("should render the forgot password page", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/forgot-password",
                    element: <ForgotPassword />,
                    loader: forgotPasswordLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/forgot-password"]
            }
        );

        render(<RouterProvider router={router} />);
        
        // Wait for loader data to be available
        expect(await screen.findByRole("heading", { name: /Reset your password/i })).toBeInTheDocument();
    });

    it("should render the email input field", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/forgot-password",
                    element: <ForgotPassword />,
                    loader: forgotPasswordLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/forgot-password"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Reset your password/i });
        
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    });

    it("should render the reset password button", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/forgot-password",
                    element: <ForgotPassword />,
                    loader: forgotPasswordLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/forgot-password"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Reset your password/i });
        
        expect(screen.getByRole("button", { name: /Send reset link/i })).toBeInTheDocument();
    });

    it("should render the sign in link", async () => {
        const router = createMemoryRouter(
            [
                {
                    path: "/forgot-password",
                    element: <ForgotPassword />,
                    loader: forgotPasswordLoader,
                    HydrateFallback: () => null
                }
            ],
            {
                initialEntries: ["/forgot-password"]
            }
        );

        render(<RouterProvider router={router} />);
        
        await screen.findByRole("heading", { name: /Reset your password/i });
        
        expect(screen.getByRole("link", { name: /Sign in/i })).toBeInTheDocument();
    });
});

