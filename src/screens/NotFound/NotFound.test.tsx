import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound", () => {
    it("should render the 404 not found page", () => {
        const router = createMemoryRouter(
            [
                {
                    path: "*",
                    element: <NotFound />
                }
            ],
            {
                initialEntries: ["/nonexistent"]
            }
        );

        render(<RouterProvider router={router} />);
        
        expect(screen.getByRole("heading", { name: /Page Not Found/i })).toBeInTheDocument();
    });
});
