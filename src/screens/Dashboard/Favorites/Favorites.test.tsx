import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Favorites from "./Favorites";

// Mock useHelmet hook
vi.mock("@hooks/useHelmet", () => ({
    default: () => ({
        setTitle: vi.fn(),
        setMeta: vi.fn()
    })
}));

// Mock AuthContext
vi.mock("@core/contexts/AuthContext", () => ({
    useAuth: () => ({
        user: { id: 1, email: "test@example.com", full_name: "Test User" },
        isLoading: false
    })
}));

// Mock DashboardSidebar
vi.mock("../DashboardSidebar", () => ({
    default: ({ currentPath }: { currentPath: string }) => <div data-testid="dashboard-sidebar">Sidebar ({currentPath})</div>,
    UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>
}));

describe("Favorites", () => {
    it("should render the favorites page", async () => {
        const router = createMemoryRouter([
            {
                path: "/dashboard/favorites",
                element: <Favorites />,
                loader: async () => ({
                    title: "Favorites - NoBullFit",
                    meta: [{ name: "description", content: "Your favorite items" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" }
                })
            }
        ], {
            initialEntries: ["/dashboard/favorites"]
        });

        render(<RouterProvider router={router} />);

        // Wait for loader to complete - use level to be specific
        await screen.findByRole("heading", { level: 1, name: /favorites/i });

        expect(screen.getByRole("heading", { level: 1, name: /favorites/i })).toBeInTheDocument();
        expect(screen.getByText(/your favorite items will appear here/i)).toBeInTheDocument();
    });
});
