import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import GroceryLists from "./GroceryLists";

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

// Helper to create router with loader data
function createGroceryListsRouter(lists: Array<{
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    items: Array<{
        id: number;
        food_id: string;
        food_label: string;
        quantity: number;
        unit?: string;
    }>;
}> = []) {
    return createMemoryRouter([
        {
            path: "/dashboard/grocery-lists",
            element: <GroceryLists />,
            loader: async () => ({
                title: "Grocery Lists - NoBullFit",
                meta: [{ name: "description", content: "Create and manage your grocery lists" }],
                lists
            })
        }
    ], {
        initialEntries: ["/dashboard/grocery-lists"]
    });
}

describe("GroceryLists", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the grocery lists page", async () => {
        const router = createGroceryListsRouter();
        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        expect(screen.getByRole("heading", { level: 1, name: /grocery lists/i })).toBeInTheDocument();
        expect(screen.getByText(/create and manage your grocery lists/i)).toBeInTheDocument();
    });

    it("should show dropdown menu button for each grocery list", async () => {
        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            },
            {
                id: 2,
                name: "Party Supplies",
                created_at: "2024-01-02T00:00:00Z",
                updated_at: "2024-01-02T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Both lists should have a dropdown menu button
        const menuButtons = screen.getAllByRole("button", { name: /list options/i });
        expect(menuButtons).toHaveLength(2);
    });

    it("should open Add Item dialog when clicking Add Item from dropdown menu", async () => {
        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Click the dropdown menu button
        const menuButton = screen.getByRole("button", { name: /list options/i });
        fireEvent.click(menuButton);

        // Wait for menu to open, then click Add Item
        const addItemOption = await screen.findByRole("menuitem", { name: /add item/i });
        fireEvent.click(addItemOption);

        // Dialog should be open
        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Check dialog title
        expect(screen.getByText("Add Item to List")).toBeInTheDocument();

        // Check dialog has the required fields
        expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/unit/i)).toBeInTheDocument();
    });

    it("should disable Add Item button in dialog when item name is empty", async () => {
        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Open the dropdown menu and click Add Item
        const menuButton = screen.getByRole("button", { name: /list options/i });
        fireEvent.click(menuButton);

        await waitFor(() => {
            const addItemOption = screen.getByRole("menuitem", { name: /add item/i });
            fireEvent.click(addItemOption);
        });

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // The Add Item button in the dialog should be disabled initially
        const dialogAddButton = screen.getByRole("button", { name: /^add item$/i });
        expect(dialogAddButton).toBeDisabled();
    });

    it("should enable Add Item button in dialog when item name is entered", async () => {
        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Open the dropdown menu and click Add Item
        const menuButton = screen.getByRole("button", { name: /list options/i });
        fireEvent.click(menuButton);

        await waitFor(() => {
            const addItemOption = screen.getByRole("menuitem", { name: /add item/i });
            fireEvent.click(addItemOption);
        });

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Type an item name
        const itemNameInput = screen.getByLabelText(/item name/i);
        fireEvent.change(itemNameInput, { target: { value: "Milk" } });

        // The Add Item button should now be enabled
        const dialogAddButton = screen.getByRole("button", { name: /^add item$/i });
        expect(dialogAddButton).not.toBeDisabled();
    });

    it("should close Add Item dialog when Cancel is clicked", async () => {
        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Open the dropdown menu and click Add Item
        const menuButton = screen.getByRole("button", { name: /list options/i });
        fireEvent.click(menuButton);

        await waitFor(() => {
            const addItemOption = screen.getByRole("menuitem", { name: /add item/i });
            fireEvent.click(addItemOption);
        });

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Click Cancel
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        fireEvent.click(cancelButton);

        // Dialog should be closed
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("should add custom item to grocery list", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                success: true,
                items: [{
                    id: 100,
                    food_id: "custom_123",
                    food_label: "Milk",
                    quantity: 2,
                    unit: "gallons"
                }]
            })
        });
        global.fetch = mockFetch;

        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Open the dropdown menu and click Add Item
        const menuButton = screen.getByRole("button", { name: /list options/i });
        fireEvent.click(menuButton);

        await waitFor(() => {
            const addItemOption = screen.getByRole("menuitem", { name: /add item/i });
            fireEvent.click(addItemOption);
        });

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument();
        });

        // Fill in the form
        const itemNameInput = screen.getByLabelText(/item name/i);
        fireEvent.change(itemNameInput, { target: { value: "Milk" } });

        const quantityInput = screen.getByLabelText(/quantity/i);
        fireEvent.change(quantityInput, { target: { value: "2" } });

        const unitInput = screen.getByLabelText(/unit/i);
        fireEvent.change(unitInput, { target: { value: "gallons" } });

        // Submit
        const dialogAddButton = screen.getByRole("button", { name: /^add item$/i });
        fireEvent.click(dialogAddButton);

        // Verify API was called correctly
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                "/api/grocery-lists/1/items",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        items: [{
                            foodLabel: "Milk",
                            quantity: 2,
                            unit: "gallons"
                        }]
                    })
                })
            );
        });

        // Dialog should close after successful add
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
    });

    it("should show empty list message mentioning Add Item button", async () => {
        const router = createGroceryListsRouter([
            {
                id: 1,
                name: "Weekly Shopping",
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-01T00:00:00Z",
                items: []
            }
        ]);

        render(<RouterProvider router={router} />);

        await screen.findByRole("heading", { level: 1, name: /grocery lists/i });

        // Expand the list to see the empty message
        const listHeader = screen.getByRole("heading", { level: 2, name: /weekly shopping/i });
        fireEvent.click(listHeader);

        // Check for empty list message mentioning Add Item
        await waitFor(() => {
            expect(screen.getByText(/use the "add item" button/i)).toBeInTheDocument();
        });
    });
});
