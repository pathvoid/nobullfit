import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Billing from "./Billing";

// Mock useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock MaintenanceBanner to prevent fetch interference
vi.mock("@components/maintenance-banner", () => ({
    MaintenanceBanner: () => null
}));

// Mock AuthContext
const mockUser = { id: 1, email: "test@example.com", full_name: "Test User" };
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        user: mockUser,
        isLoading: false
    })
}));

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

// Mock sonner toast
vi.mock("sonner", () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn()
    }
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window.open
const mockWindowOpen = vi.fn();
global.open = mockWindowOpen;

describe("Billing", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mock for subscription endpoint
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                plan: "free",
                subscribed: false,
                subscribedAt: null,
                subscriptionStatus: null,
                subscriptionEndsAt: null,
                subscriptionCanceledAt: null,
                subscription: null
            })
        });

        // Mock localStorage
        Object.defineProperty(window, "localStorage", {
            value: {
                getItem: vi.fn(() => "test_token"),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            writable: true
        });

        Object.defineProperty(window, "sessionStorage", {
            value: {
                getItem: vi.fn(() => null),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            writable: true
        });
    });

    const createRouter = () => {
        return createMemoryRouter([
            {
                path: "/dashboard/billing",
                element: <Billing />,
                loader: async () => ({
                    title: "Billing - NoBullFit",
                    meta: [],
                    user: mockUser
                })
            }
        ], {
            initialEntries: ["/dashboard/billing"]
        });
    };

    it("should render billing page", async () => {
        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /Billing/i })).toBeInTheDocument();
        });
    });

    it("should display loading state initially", async () => {
        // Delay the response to see loading state
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({
                ok: true,
                json: async () => ({
                    plan: "free",
                    subscribed: false,
                    subscription: null
                })
            }), 500))
        );

        const router = createRouter();
        render(<RouterProvider router={router} />);

        // Use waitFor to catch the loading state which appears after loader resolves
        await waitFor(() => {
            expect(screen.getByText(/Loading billing information/i)).toBeInTheDocument();
        }, { timeout: 200 });
    });

    it("should display free plan for non-subscribed users", async () => {
        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/NoBullFit Free/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/Free forever/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Upgrade to Pro/i })).toBeInTheDocument();
    });

    it("should display pro plan for subscribed users", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                plan: "pro",
                subscribed: true,
                subscribedAt: "2024-01-01T00:00:00Z",
                subscriptionStatus: "active",
                subscriptionEndsAt: null,
                subscriptionCanceledAt: null,
                subscription: {
                    id: "sub_123",
                    status: "active",
                    nextBilledAt: "2024-02-01T00:00:00Z",
                    currentPeriod: {
                        starts_at: "2024-01-01T00:00:00Z",
                        ends_at: "2024-02-01T00:00:00Z"
                    },
                    scheduledChange: null,
                    price: {
                        amount: "$10.00",
                        interval: "month",
                        frequency: 1
                    }
                }
            })
        });

        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/NoBullFit Pro/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/\$10\/month/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Manage Subscription/i })).toBeInTheDocument();
    });

    it("should display active status badge for active subscription", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                plan: "pro",
                subscribed: true,
                subscriptionStatus: "active",
                subscription: {
                    id: "sub_123",
                    status: "active",
                    nextBilledAt: "2024-02-01T00:00:00Z",
                    price: { amount: "$10.00", interval: "month", frequency: 1 }
                }
            })
        });

        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Active")).toBeInTheDocument();
        });
    });

    it("should display cancellation notice for scheduled cancellation", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                plan: "pro",
                subscribed: true,
                subscriptionStatus: "active",
                subscription: {
                    id: "sub_123",
                    status: "active",
                    nextBilledAt: null,
                    scheduledChange: {
                        action: "cancel",
                        effective_at: "2024-02-01T00:00:00Z"
                    },
                    price: { amount: "$10.00", interval: "month", frequency: 1 }
                }
            })
        });

        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/scheduled to cancel/i)).toBeInTheDocument();
        });
    });

    it("should display past due notice for past due subscription", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                plan: "pro",
                subscribed: true,
                subscriptionStatus: "past_due",
                subscription: {
                    id: "sub_123",
                    status: "past_due",
                    nextBilledAt: null,
                    scheduledChange: null,
                    price: { amount: "$10.00", interval: "month", frequency: 1 }
                }
            })
        });

        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Payment failed/i)).toBeInTheDocument();
        });
    });

    it("should open customer portal when manage subscription is clicked", async () => {
        (global.fetch as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    plan: "pro",
                    subscribed: true,
                    subscriptionStatus: "active",
                    subscription: {
                        id: "sub_123",
                        status: "active",
                        nextBilledAt: "2024-02-01T00:00:00Z",
                        price: { amount: "$10.00", interval: "month", frequency: 1 }
                    }
                })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ url: "https://portal.paddle.com/session" })
            });

        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /Manage Subscription/i })).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole("button", { name: /Manage Subscription/i }));

        await waitFor(() => {
            expect(mockWindowOpen).toHaveBeenCalledWith("https://portal.paddle.com/session", "_blank");
        });
    });

    it("should display upgrade button for free users", async () => {
        const router = createRouter();
        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/NoBullFit Free/i)).toBeInTheDocument();
        });

        // Check for upgrade button
        expect(screen.getByRole("button", { name: /Upgrade to Pro/i })).toBeInTheDocument();
        // Check for sync button
        expect(screen.getByRole("button", { name: /Sync Status/i })).toBeInTheDocument();
    });

    it("should handle API errors gracefully", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

        const router = createRouter();
        render(<RouterProvider router={router} />);

        // Should still render the page after error
        await waitFor(() => {
            expect(screen.queryByText(/Loading billing information/i)).not.toBeInTheDocument();
        });
    });
});
