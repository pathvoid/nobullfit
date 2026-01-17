import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ResetPassword from "./ResetPassword";

// Mock useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ResetPassword", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should render invalid link message when no token is provided", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: [{ name: "description", content: "Reset your password" }]
                })
            }
        ], {
            initialEntries: ["/reset-password"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /invalid reset link/i });

        expect(screen.getByRole("heading", { name: /invalid reset link/i })).toBeInTheDocument();
        expect(screen.getByText(/this password reset link is invalid or has expired/i)).toBeInTheDocument();
    });

    it("should render request new reset link button when no token", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("link", { name: /request new reset link/i })).toBeInTheDocument();
        });
    });

    it("should render reset password form when token is provided", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=valid-token"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { name: /reset your password/i });

        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
    });

    it("should not call API when passwords do not match", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=valid-token"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByLabelText(/new password/i);

        fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "password123" } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "differentpassword" } });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

        // API should not be called when validation fails (error shown via toast)
        await waitFor(() => {
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    it("should not call API when password is too short", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=valid-token"]
        });

        render(<RouterProvider router={router} />);

        await screen.findByLabelText(/new password/i);

        fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "short" } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "short" } });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

        // API should not be called when validation fails (error shown via toast)
        await waitFor(() => {
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    it("should show sign in link after successful password reset", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=valid-token"]
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Password reset successfully" })
        });

        render(<RouterProvider router={router} />);

        await screen.findByLabelText(/new password/i);

        fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpassword123" } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "newpassword123" } });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

        // Success state shows Go to Sign In link (success message shown via toast)
        await waitFor(() => {
            expect(screen.getByRole("link", { name: /go to sign in/i })).toBeInTheDocument();
        });
    });

    it("should call API when form is submitted with valid data", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=test-token"]
        });

        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Token has expired" })
        });

        render(<RouterProvider router={router} />);

        await screen.findByLabelText(/new password/i);

        fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpassword123" } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "newpassword123" } });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

        // Error is now shown via toast notification, verify API was called
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/reset-password",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("test-token")
                })
            );
        });
    });

    it("should show Go to Sign In button after success", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=valid-token"]
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: "Success" })
        });

        render(<RouterProvider router={router} />);

        await screen.findByLabelText(/new password/i);

        fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpassword123" } });
        fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "newpassword123" } });
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

        await waitFor(() => {
            expect(screen.getByRole("link", { name: /go to sign in/i })).toBeInTheDocument();
        });
    });

    it("should show sign in link at bottom of form", async () => {
        const router = createMemoryRouter([
            {
                path: "/reset-password",
                element: <ResetPassword />,
                loader: async () => ({
                    title: "Reset Password - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/reset-password?token=valid-token"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
        });
    });
});
