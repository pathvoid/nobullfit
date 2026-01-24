import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Integrations from "./Integrations";

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
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Mock fetch
global.fetch = vi.fn();

// Strava-only integration response
const mockIntegrationsResponse = {
    integrations: [
        {
            provider: "strava",
            providerName: "Strava",
            description: "Import your running, cycling, and other workouts from Strava",
            category: "workout",
            logoUrl: "/images/integrations/strava.svg",
            supportedDataTypes: ["workouts", "calories_burned"],
            isEnabled: true,
            isConnected: false,
            mobileOnly: false
        }
    ],
    grouped: {
        wearable: [],
        workout: [],
        scale: []
    },
    anyEnabled: true
};

describe("Integrations", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => mockIntegrationsResponse
        });
    });

    it("should render the page title", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/integrations",
                element: <Integrations />,
                loader: async () => ({
                    title: "Health & Fitness Apps - NoBullFit",
                    meta: [],
                    user: { subscribed: false }
                })
            }
        ], {
            initialEntries: ["/dashboard/integrations"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /Health & Fitness Apps/i })).toBeInTheDocument();
        });
    });

    it("should show fallback message when no integrations are enabled", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                ...mockIntegrationsResponse,
                integrations: [],
                anyEnabled: false
            })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/integrations",
                element: <Integrations />,
                loader: async () => ({
                    title: "Health & Fitness Apps - NoBullFit",
                    meta: [],
                    user: { subscribed: false }
                })
            }
        ], {
            initialEntries: ["/dashboard/integrations"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(
                screen.getByRole("heading", { name: /No Integrations Available/i })
            ).toBeInTheDocument();
        });
    });

    it("should display Strava integration card when loaded", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/integrations",
                element: <Integrations />,
                loader: async () => ({
                    title: "Health & Fitness Apps - NoBullFit",
                    meta: [],
                    user: { subscribed: false }
                })
            }
        ], {
            initialEntries: ["/dashboard/integrations"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Strava")).toBeInTheDocument();
        });
    });

    it("should show error state when fetch fails", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/integrations",
                element: <Integrations />,
                loader: async () => ({
                    title: "Health & Fitness Apps - NoBullFit",
                    meta: [],
                    user: { subscribed: false }
                })
            }
        ], {
            initialEntries: ["/dashboard/integrations"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/Failed to load integrations/)).toBeInTheDocument();
        });
    });


    it("should show Connected badge when integration is connected", async () => {
        const connectedResponse = {
            ...mockIntegrationsResponse,
            integrations: [{
                ...mockIntegrationsResponse.integrations[0],
                isConnected: true,
                connectionStatus: "active"
            }]
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => connectedResponse
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/integrations",
                element: <Integrations />,
                loader: async () => ({
                    title: "Health & Fitness Apps - NoBullFit",
                    meta: [],
                    user: { subscribed: false }
                })
            }
        ], {
            initialEntries: ["/dashboard/integrations"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Connected")).toBeInTheDocument();
        });
    });

    it("should show auto-sync section for Pro users with connected integration", async () => {
        const connectedResponse = {
            ...mockIntegrationsResponse,
            integrations: [{
                ...mockIntegrationsResponse.integrations[0],
                isConnected: true,
                connectionStatus: "active"
            }]
        };

        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            if (url === "/api/integrations") {
                return Promise.resolve({
                    ok: true,
                    json: async () => connectedResponse
                });
            }
            if (url === "/api/integrations/strava/auto-sync") {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        isEnabled: false,
                        syncFrequencyMinutes: 720,
                        syncDataTypes: ["workouts", "calories_burned"]
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({})
            });
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/integrations",
                element: <Integrations />,
                loader: async () => ({
                    title: "Health & Fitness Apps - NoBullFit",
                    meta: [],
                    user: { subscribed: true }
                })
            }
        ], {
            initialEntries: ["/dashboard/integrations"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText("Auto-sync (every 12 hours)")).toBeInTheDocument();
        });
    });
});
