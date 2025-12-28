import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("Dashboard", () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the dashboard page with lorem ipsum content", async () => {
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

        // Check for lorem ipsum sections
        expect(screen.getByRole("heading", { name: /lorem ipsum section/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /another section/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /more content/i })).toBeInTheDocument();

        // Check for lorem ipsum text
        expect(screen.getByText(/lorem ipsum dolor sit amet/i)).toBeInTheDocument();
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
});
