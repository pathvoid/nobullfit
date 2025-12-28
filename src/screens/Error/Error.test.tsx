import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Error from "./Error";

// Mock useRouteError and isRouteErrorResponse from react-router-dom
const mockUseRouteError = vi.fn();
const mockIsRouteErrorResponse = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useRouteError: () => mockUseRouteError(),
        isRouteErrorResponse: (error: unknown) => mockIsRouteErrorResponse(error)
    };
});

describe("Error", () => {
    beforeEach(() => {
        mockUseRouteError.mockClear();
        mockIsRouteErrorResponse.mockClear();
    });

    it("should render the 405 Method Not Allowed error page", () => {
        const errorResponse = {
            status: 405,
            statusText: "Method Not Allowed"
        };
        mockUseRouteError.mockReturnValue(errorResponse);
        mockIsRouteErrorResponse.mockReturnValue(true);

        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <Error />,
                    errorElement: <Error />
                }
            ],
            {
                initialEntries: ["/"]
            }
        );

        render(<RouterProvider router={router} />);
        
        expect(screen.getByRole("heading", { name: /Method Not Allowed/i })).toBeInTheDocument();
        expect(screen.getByText(/405/)).toBeInTheDocument();
    });

    it("should render the 500 Internal Server Error page", () => {
        const errorResponse = {
            status: 500,
            statusText: "Internal Server Error"
        };
        mockUseRouteError.mockReturnValue(errorResponse);
        mockIsRouteErrorResponse.mockReturnValue(true);

        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <Error />,
                    errorElement: <Error />
                }
            ],
            {
                initialEntries: ["/"]
            }
        );

        render(<RouterProvider router={router} />);
        
        expect(screen.getByRole("heading", { name: /Internal Server Error/i })).toBeInTheDocument();
        expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it("should render generic error for unknown error types", () => {
        // Create a plain error object with message property
        const errorObj = {
            message: "Something went wrong"
        };
        mockUseRouteError.mockReturnValue(errorObj);
        mockIsRouteErrorResponse.mockReturnValue(false);

        const router = createMemoryRouter(
            [
                {
                    path: "/",
                    element: <Error />,
                    errorElement: <Error />
                }
            ],
            {
                initialEntries: ["/"]
            }
        );

        render(<RouterProvider router={router} />);
        
        expect(screen.getByRole("heading", { name: /Error/i })).toBeInTheDocument();
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
});

