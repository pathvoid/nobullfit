import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import ConfirmEmailChange from "./ConfirmEmailChange";

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

// Store original location
const originalLocation = window.location;

describe("ConfirmEmailChange", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Restore window.location
        Object.defineProperty(window, "location", {
            value: originalLocation,
            writable: true
        });
    });

    // Helper to mock window.location.search
    function mockLocationSearch(search: string) {
        Object.defineProperty(window, "location", {
            value: {
                ...originalLocation,
                search: search,
                href: `http://localhost${search}`
            },
            writable: true
        });
    }

    it("should render the confirm email change page", async () => {
        // Mock the location search with token
        mockLocationSearch("?token=valid-token");
        
        // Set up mock BEFORE rendering
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Email updated successfully" })
        });

        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: [{ name: "description", content: "Confirm your email change" }]
                })
            }
        ], {
            initialEntries: ["/confirm-email-change?token=valid-token"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /confirm email change/i });

        expect(screen.getByRole("heading", { name: /confirm email change/i })).toBeInTheDocument();
    });

    it("should show loading state initially", async () => {
        // Mock the location search with token
        mockLocationSearch("?token=valid-token");
        
        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/confirm-email-change?token=valid-token"]
        });

        // Never resolve fetch to keep in loading state
        mockFetch.mockImplementation(() => new Promise(() => {}));

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/processing your email change confirmation/i)).toBeInTheDocument();
        });
    });

    it("should show error when no token is provided", async () => {
        // Mock the location search with no token
        mockLocationSearch("");
        
        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/confirm-email-change"]
        });

        render(<RouterProvider router={router} />);

        // Error state shows Go to Settings button
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /go to settings/i })).toBeInTheDocument();
        });
    });

    it("should show success message after successful confirmation", async () => {
        // Use a unique token for this test to avoid module-level caching
        const uniqueToken = `success-token-${Date.now()}`;
        mockLocationSearch(`?token=${uniqueToken}`);
        
        // Set up mock BEFORE rendering
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Your email address has been successfully updated." })
        });

        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: [`/confirm-email-change?token=${uniqueToken}`]
        });

        render(<RouterProvider router={router} />);

        // Wait for the API call to complete and success state to render
        await waitFor(() => {
            expect(screen.getByText(/your email address has been successfully updated/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("should show error message when confirmation fails", async () => {
        // Mock the location search with token
        mockLocationSearch("?token=invalid-token");
        
        // Set up mock BEFORE rendering
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Token expired or invalid" })
        });

        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/confirm-email-change?token=invalid-token"]
        });

        render(<RouterProvider router={router} />);

        // Error state shows Go to Settings button (error details shown via toast)
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /go to settings/i })).toBeInTheDocument();
        });
    });

    it("should show sign in button after successful confirmation", async () => {
        // Use a unique token for this test to avoid module-level caching
        const uniqueToken = `signin-token-${Date.now()}`;
        mockLocationSearch(`?token=${uniqueToken}`);
        
        // Set up mock BEFORE rendering
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ message: "Email updated" })
        });

        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: [`/confirm-email-change?token=${uniqueToken}`]
        });

        render(<RouterProvider router={router} />);

        // Wait for the API call to complete and success state to render
        await waitFor(() => {
            expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("should show go to settings button after error", async () => {
        // Mock the location search with token
        mockLocationSearch("?token=expired-token");
        
        // Set up mock BEFORE rendering
        mockFetch.mockResolvedValue({
            ok: false,
            json: async () => ({ error: "Token has expired" })
        });

        const router = createMemoryRouter([
            {
                path: "/confirm-email-change",
                element: <ConfirmEmailChange />,
                loader: async () => ({
                    title: "Confirm Email Change - NoBullFit",
                    meta: []
                })
            }
        ], {
            initialEntries: ["/confirm-email-change?token=expired-token"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /go to settings/i })).toBeInTheDocument();
        });
    });
});
