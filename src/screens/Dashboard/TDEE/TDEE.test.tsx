import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import TDEE from "./TDEE";

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

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// Mock fetch for API calls
global.fetch = vi.fn();

describe("TDEE", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
    });

    it("should render the TDEE calculator page", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: null })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: false,
                    weightData: null,
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByRole("heading", { name: /tdee calculator/i })).toBeInTheDocument();
        });

        expect(screen.getByText(/calculate your total daily energy expenditure/i)).toBeInTheDocument();
    });

    it("should display error message when user has no weight data", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: null })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: false,
                    weightData: null,
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/weight data required/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/you need to log your weight/i)).toBeInTheDocument();
    });

    it("should display current weight when user has weight data", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: { weight: 70, unit: "kg" } })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/current weight:/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/70 kg/i)).toBeInTheDocument();
    });

    it("should display form fields", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: { weight: 70, unit: "kg" } })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/activity level/i)).toBeInTheDocument();
    });

    it("should load existing TDEE data", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ tdee: { id: 1, age: 30, gender: "male", height_cm: 180, activity_level: "moderately_active", bmr: 2000, tdee: 3100 } })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: {
                        id: 1,
                        age: 30,
                        gender: "male" as const,
                        height_cm: 180,
                        activity_level: "moderately_active" as const,
                        bmr: 2000,
                        tdee: 3100,
                        created_at: "2024-01-01T00:00:00Z",
                        updated_at: "2024-01-01T00:00:00Z"
                    }
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            const ageInput = screen.getByLabelText(/age/i) as HTMLInputElement;
            expect(ageInput.value).toBe("30");
        });

        const genderSelect = screen.getByLabelText(/gender/i) as HTMLSelectElement;
        expect(genderSelect.value).toBe("male");
    });

    it("should validate form fields", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: { weight: 70, unit: "kg" } })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
        });

        // Fill form with invalid values to trigger validation
        const ageInput = screen.getByLabelText(/age/i) as HTMLInputElement;
        fireEvent.change(ageInput, { target: { value: "200" } }); // Invalid: out of range

        const heightInput = screen.getByLabelText(/height/i) as HTMLInputElement;
        fireEvent.change(heightInput, { target: { value: "180" } }); // Valid height

        // Submit the form directly to bypass HTML5 validation
        const form = ageInput.closest("form");
        if (form) {
            fireEvent.submit(form);
        }

        await waitFor(() => {
            expect(screen.getByText(/age must be a valid number between 1 and 150/i)).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it("should submit form and calculate TDEE", async () => {
        (global.fetch as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ weight: { weight: 70, unit: "kg" } })
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tdee: {
                        id: 1,
                        age: 30,
                        gender: "male",
                        height_cm: 180,
                        activity_level: "moderately_active",
                        bmr: 2000,
                        tdee: 3100,
                        created_at: "2024-01-01T00:00:00Z",
                        updated_at: "2024-01-01T00:00:00Z"
                    }
                })
            });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
        });

        const ageInput = screen.getByLabelText(/age/i);
        fireEvent.change(ageInput, { target: { value: "30" } });

        const heightInput = screen.getByLabelText(/height/i);
        fireEvent.change(heightInput, { target: { value: "180" } });

        const submitButton = screen.getByRole("button", { name: /save/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/tdee",
                expect.objectContaining({
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                })
            );
        });
    });

    it("should switch between cm and feet/inches height units", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: { weight: 70, unit: "kg" } })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: null
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
        });

        const feetInchesButton = screen.getByRole("button", { name: /feet & inches/i });
        fireEvent.click(feetInchesButton);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/feet/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/inches/i)).toBeInTheDocument();
        });
    });

    it("should display TDEE results after calculation", async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: true,
            json: async () => ({ weight: { weight: 70, unit: "kg" } })
        });

        const router = createMemoryRouter([
            {
                path: "/dashboard/tdee",
                element: <TDEE />,
                loader: async () => ({
                    title: "TDEE Calculator - NoBullFit",
                    meta: [{ name: "description", content: "Calculate your Total Daily Energy Expenditure (TDEE)" }],
                    user: { id: 1, email: "test@example.com", full_name: "Test User" },
                    hasWeight: true,
                    weightData: { weight: 70, unit: "kg" as const },
                    tdeeData: {
                        id: 1,
                        age: 30,
                        gender: "male" as const,
                        height_cm: 180,
                        activity_level: "moderately_active" as const,
                        bmr: 2000,
                        tdee: 3100,
                        created_at: "2024-01-01T00:00:00Z",
                        updated_at: "2024-01-01T00:00:00Z"
                    }
                })
            }
        ], {
            initialEntries: ["/dashboard/tdee"]
        });

        render(<RouterProvider router={router} />);

        await waitFor(() => {
            expect(screen.getByText(/your tdee results/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/2000 calories\/day/i)).toBeInTheDocument();
        expect(screen.getByText(/3100 calories\/day/i)).toBeInTheDocument();
    });
});
