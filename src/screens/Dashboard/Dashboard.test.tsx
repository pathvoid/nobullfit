import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./Dashboard";
import * as AuthContext from "@core/contexts/AuthContext";

// Mock useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock usePWAInstallPrompt hook
vi.mock("@hooks/usePWAInstallPrompt", () => ({
    default: () => {},
    usePWAInstallPrompt: () => {}
}));

// Mock MaintenanceBanner to prevent fetch interference
vi.mock("@components/maintenance-banner", () => ({
    MaintenanceBanner: () => null
}));

// Mock AuthContext
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: vi.fn()
}));

// Mock DashboardSidebar
vi.mock("./DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => (
        <div data-testid="user-dropdown">
            <button>Sign out</button>
        </div>
    )
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe("Dashboard", () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for fetch (stats and goal insights)
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({
                today: {
                    calories_consumed: 0,
                    calories_burned: 0,
                    food_count: 0,
                    activity_count: 0
                },
                dailyStats: [],
                activityTypes: [],
                categories: [],
                weightData: []
            })
        });
    });

    it("should render the dashboard page", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "Test User" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /dashboard/i, level: 1 });

        // Check for main heading
        expect(screen.getByRole("heading", { name: /dashboard/i, level: 1 })).toBeInTheDocument();

        // Check for welcome message
        expect(screen.getByText(/welcome back, test user!/i)).toBeInTheDocument();
    });

    it("should display logout button in navbar", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "Test User" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /dashboard/i });

        // Check for sign out button (the component uses "Sign out" not "logout")
        const signOutButtons = screen.getAllByText(/Sign out/i);
        expect(signOutButtons.length).toBeGreaterThan(0);
    });

    it("should display user name when logged in", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "John Doe" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "John Doe" }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /dashboard/i });

        expect(screen.getByText(/welcome back, john doe!/i)).toBeInTheDocument();
    });

    it("should display 'User' when user name is not available", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "" }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete
        await screen.findByRole("heading", { name: /dashboard/i });

        expect(screen.getByText(/welcome back, user!/i)).toBeInTheDocument();
    });

    // Pro feature: Goal Insights tests
    it("should display goal insights for Pro users with goal set", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "Test User" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        // Mock fetch for goal insights
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            if (url.includes("/api/dashboard/goal-insights")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        hasGoal: true,
                        hasTdee: true,
                        hasWeight: true,
                        insights: {
                            weightGoal: "lose",
                            targetWeight: 70,
                            currentWeight: 80,
                            weightUnit: "kg",
                            tdee: 2500,
                            recommendedCalories: 2000,
                            calorieAdjustment: -500,
                            macros: {
                                protein: 35,
                                carbs: 35,
                                fat: 30,
                                proteinGrams: 150,
                                carbsGrams: 175,
                                fatGrams: 67
                            },
                            weeklyProgress: [],
                            projectedWeeksToGoal: 20,
                            projectedDate: "2026-06-01",
                            weeklyTargetChange: -0.5,
                            actualWeeklyChange: -0.3
                        }
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    today: {
                        calories_consumed: 0,
                        calories_burned: 0,
                        food_count: 0,
                        activity_count: 0
                    },
                    dailyStats: [],
                    activityTypes: [],
                    categories: [],
                    weightData: []
                })
            });
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User", subscribed: true }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for goal insights to load
        await waitFor(() => {
            expect(screen.getByText(/goal: lose weight/i)).toBeInTheDocument();
        });

        // Check for recommended calories
        expect(screen.getByText(/2000 cal/i)).toBeInTheDocument();

        // Check for macro recommendations
        expect(screen.getByText(/150g/)).toBeInTheDocument(); // Protein
    });

    it("should not display goal insights for non-Pro users", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "Test User" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User", subscribed: false }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for dashboard to load
        await screen.findByRole("heading", { name: /dashboard/i });

        // Goal insights should not be fetched or displayed for non-Pro users
        expect(screen.queryByText(/goal: lose weight/i)).not.toBeInTheDocument();
    });

    it("should not display goal insights when Pro user has no goal set", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "Test User" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        // Mock fetch for goal insights - no goal set
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            if (url.includes("/api/dashboard/goal-insights")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        hasGoal: false,
                        message: "No weight goal set. Set your goal in the TDEE page."
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    today: {
                        calories_consumed: 0,
                        calories_burned: 0,
                        food_count: 0,
                        activity_count: 0
                    },
                    dailyStats: [],
                    activityTypes: [],
                    categories: [],
                    weightData: []
                })
            });
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User", subscribed: true }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for dashboard to load
        await screen.findByRole("heading", { name: /dashboard/i });

        // Goal insights section should not be displayed when no goal is set
        expect(screen.queryByText(/goal: lose weight/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/goal: maintain weight/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/goal: gain weight/i)).not.toBeInTheDocument();
    });

    it("should display adjust goal button in goal insights", async () => {
        vi.spyOn(AuthContext, "useAuth").mockReturnValue({
            user: { id: 1, email: "test@example.com", full_name: "Test User" },
            isLoading: false,
            login: vi.fn(),
            logout: mockLogout,
            checkAuth: vi.fn()
        });

        // Mock fetch for goal insights
        (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
            if (url.includes("/api/dashboard/goal-insights")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        hasGoal: true,
                        hasTdee: true,
                        hasWeight: true,
                        insights: {
                            weightGoal: "maintain",
                            targetWeight: null,
                            currentWeight: 75,
                            weightUnit: "kg",
                            tdee: 2200,
                            recommendedCalories: 2200,
                            calorieAdjustment: 0,
                            macros: {
                                protein: 30,
                                carbs: 40,
                                fat: 30,
                                proteinGrams: 120,
                                carbsGrams: 220,
                                fatGrams: 73
                            },
                            weeklyProgress: [],
                            projectedWeeksToGoal: null,
                            projectedDate: null,
                            weeklyTargetChange: 0,
                            actualWeeklyChange: null
                        }
                    })
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({
                    today: {
                        calories_consumed: 0,
                        calories_burned: 0,
                        food_count: 0,
                        activity_count: 0
                    },
                    dailyStats: [],
                    activityTypes: [],
                    categories: [],
                    weightData: []
                })
            });
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard",
                element: <Dashboard />,
                loader: async () => ({
                    title: "Dashboard - NoBullFit",
                    meta: [{ name: "description", content: "Your NoBullFit dashboard" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User", subscribed: true }
                })
            }
        ], {
            initialEntries: ["/dashboard"]
        });

        render(<RouterProvider router={router} />);

        // Wait for goal insights to load
        await waitFor(() => {
            expect(screen.getByText(/goal: maintain weight/i)).toBeInTheDocument();
        });

        // Check for adjust goal button
        expect(screen.getByRole("button", { name: /adjust goal/i })).toBeInTheDocument();
    });
});
