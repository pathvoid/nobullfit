import useHelmet from "@hooks/useHelmet";
import { useLoaderData } from "react-router-dom";
import { useState } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Input } from "@components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Checkbox } from "@components/checkbox";
import { Link } from "@components/link";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "@components/dialog";
import { Field, Label as FieldLabel } from "@components/fieldset";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownLabel, DropdownDivider } from "@components/dropdown";
import { ChevronDown, ChevronUp, Search, Plus, Minus, Mail, Pencil, Trash2, MoreVertical } from "lucide-react";
import DashboardSidebar, { UserDropdown } from "../DashboardSidebar";
import { toast } from "sonner";

interface GroceryListItem {
    id: number;
    food_id: string;
    food_label: string;
    food_data?: {
        brand?: string;
        category?: string;
        categoryLabel?: string;
        unit?: string;
        recipeName?: string;
        recipeId?: number;
    };
    quantity: number | string;
    unit?: string;
    notes?: string;
    created_at: string;
}

interface GroceryList {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    items: GroceryListItem[];
}

const GroceryLists: React.FC = () => {
    const loaderData = useLoaderData() as {
        title: string;
        meta: unknown[];
        lists?: GroceryList[];
        error?: string;
    };
    const helmet = useHelmet();
    const [lists, setLists] = useState<GroceryList[]>(loaderData.lists || []);
    const [selectedItems, setSelectedItems] = useState<Map<number, Set<number>>>(new Map());
    const [expandedLists, setExpandedLists] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<number | null>(null);
    const [newListName, setNewListName] = useState("");
    const [renameListName, setRenameListName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [removingItemIds, setRemovingItemIds] = useState<Set<number>>(new Set());
    const [updatingQuantityIds, setUpdatingQuantityIds] = useState<Set<number>>(new Set());
    const [sendingEmailListId, setSendingEmailListId] = useState<number | null>(null);
    const [emailResultDialog, setEmailResultDialog] = useState<{ isOpen: boolean; message: string; isError: boolean }>({
        isOpen: false,
        message: "",
        isError: false
    });
    
    // Add custom item state
    const [addItemDialogListId, setAddItemDialogListId] = useState<number | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState("1");
    const [newItemUnit, setNewItemUnit] = useState("");
    const [isAddingItem, setIsAddingItem] = useState(false);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const handleCreateList = async () => {
        if (!newListName.trim()) return;

        setIsCreating(true);
        try {
            const response = await fetch("/api/grocery-lists", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ name: newListName.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                setLists(prev => [data.list, ...prev]);
                setNewListName("");
                setIsCreateDialogOpen(false);
                toast.success("Grocery list created!");
            }
        } catch (error) {
            console.error("Error creating list:", error);
            toast.error("Failed to create grocery list. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRenameList = async (listId: number) => {
        if (!renameListName.trim()) return;

        setIsRenaming(true);
        try {
            const response = await fetch(`/api/grocery-lists/${listId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ name: renameListName.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                setLists(prev =>
                    prev.map(list => (list.id === listId ? { ...list, name: data.list.name } : list))
                );
                setRenameListName("");
                setIsRenameDialogOpen(null);
                toast.success("List renamed successfully!");
            }
        } catch (error) {
            console.error("Error renaming list:", error);
            toast.error("Failed to rename list. Please try again.");
        } finally {
            setIsRenaming(false);
        }
    };

    const handleDeleteList = async (listId: number) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/grocery-lists/${listId}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                setLists(prev => prev.filter(list => list.id !== listId));
                setIsDeleteDialogOpen(null);
                // Clear selections for this list
                const newSelected = new Map(selectedItems);
                newSelected.delete(listId);
                setSelectedItems(newSelected);
                toast.success("List deleted successfully!");
            }
        } catch (error) {
            console.error("Error deleting list:", error);
            toast.error("Failed to delete list. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRemoveItem = async (listId: number, itemId: number) => {
        setRemovingItemIds(prev => new Set(prev).add(itemId));
        try {
            const response = await fetch(`/api/grocery-lists/${listId}/items/${itemId}`, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok) {
                setLists(prev =>
                    prev.map(list =>
                        list.id === listId
                            ? { ...list, items: list.items.filter(item => item.id !== itemId) }
                            : list
                    )
                );
                // Remove from selections
                const newSelected = new Map(selectedItems);
                const listSelected = newSelected.get(listId);
                if (listSelected) {
                    listSelected.delete(itemId);
                    if (listSelected.size === 0) {
                        newSelected.delete(listId);
                    }
                }
                setSelectedItems(newSelected);
                toast.success("Item removed from list");
            }
        } catch (error) {
            console.error("Error removing item:", error);
            toast.error("Failed to remove item. Please try again.");
        } finally {
            setRemovingItemIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }
    };

    const handleBulkRemoveItems = async (listId: number) => {
        const listSelected = selectedItems.get(listId);
        if (!listSelected || listSelected.size === 0) return;

        const itemIds = Array.from(listSelected);
        itemIds.forEach(id => setRemovingItemIds(prev => new Set(prev).add(id)));

        try {
            const response = await fetch(`/api/grocery-lists/${listId}/items`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ itemIds })
            });

            if (response.ok) {
                setLists(prev =>
                    prev.map(list =>
                        list.id === listId
                            ? { ...list, items: list.items.filter(item => !listSelected.has(item.id)) }
                            : list
                    )
                );
                // Clear selections for this list
                const newSelected = new Map(selectedItems);
                newSelected.delete(listId);
                setSelectedItems(newSelected);
                toast.success("Items removed from list");
            }
        } catch (error) {
            console.error("Error bulk removing items:", error);
            toast.error("Failed to remove items. Please try again.");
        } finally {
            setRemovingItemIds(prev => {
                const newSet = new Set(prev);
                itemIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
    };

    const toggleItemSelection = (listId: number, itemId: number) => {
        const newSelected = new Map(selectedItems);
        const listSelected = newSelected.get(listId) || new Set<number>();

        if (listSelected.has(itemId)) {
            listSelected.delete(itemId);
        } else {
            listSelected.add(itemId);
        }

        if (listSelected.size === 0) {
            newSelected.delete(listId);
        } else {
            newSelected.set(listId, listSelected);
        }

        setSelectedItems(newSelected);
    };

    const toggleAllItemsInList = (listId: number, itemIds: number[]) => {
        const newSelected = new Map(selectedItems);
        const listSelected = newSelected.get(listId) || new Set<number>();
        const allSelected = itemIds.every(id => listSelected.has(id));

        if (allSelected) {
            newSelected.delete(listId);
        } else {
            newSelected.set(listId, new Set(itemIds));
        }

        setSelectedItems(newSelected);
    };

    const openRenameDialog = (list: GroceryList) => {
        setRenameListName(list.name);
        setIsRenameDialogOpen(list.id);
    };

    const toggleListExpanded = (listId: number) => {
        setExpandedLists(prev => {
            const newSet = new Set(prev);
            if (newSet.has(listId)) {
                newSet.delete(listId);
            } else {
                newSet.add(listId);
            }
            return newSet;
        });
    };

    const filteredLists = lists.filter(list =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        list.items.some(item => item.food_label.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleUpdateQuantity = async (listId: number, itemId: number, delta: number) => {
        setUpdatingQuantityIds(prev => new Set(prev).add(itemId));
        try {
            const response = await fetch(`/api/grocery-lists/${listId}/items/${itemId}/quantity`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ delta })
            });

            if (response.ok) {
                const data = await response.json();
                setLists(prev =>
                    prev.map(list =>
                        list.id === listId
                            ? {
                                  ...list,
                                  items: list.items.map(item =>
                                      item.id === itemId ? { ...item, quantity: data.item.quantity } : item
                                  )
                              }
                            : list
                    )
                );
            }
        } catch (error) {
            console.error("Error updating quantity:", error);
        } finally {
            setUpdatingQuantityIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(itemId);
                return newSet;
            });
        }
    };

    const handleAddCustomItem = async (listId: number) => {
        if (!newItemName.trim()) return;

        setIsAddingItem(true);
        try {
            const response = await fetch(`/api/grocery-lists/${listId}/items`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    items: [{
                        foodLabel: newItemName.trim(),
                        quantity: parseFloat(newItemQuantity) || 1,
                        unit: newItemUnit.trim() || null
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Update the list with new/updated items
                setLists(prev =>
                    prev.map(list => {
                        if (list.id !== listId) return list;
                        
                        // Check if the item was updated (already existed) or inserted
                        const updatedItems = [...list.items];
                        for (const newItem of data.items) {
                            const existingIndex = updatedItems.findIndex(
                                item => item.id === newItem.id
                            );
                            if (existingIndex >= 0) {
                                // Update existing item
                                updatedItems[existingIndex] = newItem;
                            } else {
                                // Add new item
                                updatedItems.push(newItem);
                            }
                        }
                        // Sort alphabetically
                        updatedItems.sort((a, b) => 
                            a.food_label.toLowerCase().localeCompare(b.food_label.toLowerCase())
                        );
                        return { ...list, items: updatedItems };
                    })
                );
                // Reset dialog state
                setNewItemName("");
                setNewItemQuantity("1");
                setNewItemUnit("");
                setAddItemDialogListId(null);
                toast.success("Item added to list!");
            }
        } catch (error) {
            console.error("Error adding custom item:", error);
            toast.error("Failed to add item. Please try again.");
        } finally {
            setIsAddingItem(false);
        }
    };

    const handleSendEmail = async (listId: number) => {
        setSendingEmailListId(listId);
        try {
            const response = await fetch(`/api/grocery-lists/${listId}/send-email`, {
                method: "POST",
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setEmailResultDialog({
                    isOpen: true,
                    message: data.message || "Grocery list sent successfully to your email!",
                    isError: false
                });
            } else {
                const error = await response.json();
                setEmailResultDialog({
                    isOpen: true,
                    message: error.error || "Failed to send email. Please try again.",
                    isError: true
                });
            }
        } catch (error) {
            console.error("Error sending email:", error);
            setEmailResultDialog({
                isOpen: true,
                message: "Failed to send email. Please try again.",
                isError: true
            });
        } finally {
            setSendingEmailListId(null);
        }
    };

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard/grocery-lists" />}
        >
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <Heading level={1}>Grocery Lists</Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Create and manage your grocery lists.
                        </Text>
                    </div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>Create New List</Button>
                </div>

                {loaderData.error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-50 p-4 dark:bg-red-950/10">
                        <Text className="text-red-600 dark:text-red-400">{loaderData.error}</Text>
                    </div>
                )}

                {lists.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
                        <Input
                            type="text"
                            placeholder="Search lists or items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                )}

                {lists.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img 
                            src="https://cdn.nobull.fit/shopping.png" 
                            alt="No grocery lists" 
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            No Grocery Lists Yet
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Create your first grocery list to get started! You can add items from the Food Database or Recipe Database.
                        </Text>
                    </div>
                ) : filteredLists.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-8 text-center dark:border-white/10 dark:bg-zinc-900/50">
                        <Text className="text-zinc-600 dark:text-zinc-400">
                            No lists found matching "{searchQuery}".
                        </Text>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredLists.map((list) => {
                            const listSelected = selectedItems.get(list.id) || new Set<number>();
                            const itemIds = list.items.map(item => item.id);
                            const allSelected = itemIds.length > 0 && itemIds.every(id => listSelected.has(id));
                            const isExpanded = expandedLists.has(list.id);

                            return (
                                <div
                                    key={list.id}
                                    className="overflow-hidden rounded-lg border border-zinc-950/10 bg-white dark:border-white/10 dark:bg-zinc-900"
                                >
                                    {/* List Header - Always Visible */}
                                    <div className="flex items-center gap-3 p-4 justify-between">
                                        <button
                                            onClick={() => toggleListExpanded(list.id)}
                                            className="flex flex-1 items-center gap-3 text-left hover:opacity-80 min-w-0"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                                            ) : (
                                                <ChevronDown className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <Heading level={2} className="text-lg truncate">
                                                    {list.name}
                                                </Heading>
                                                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {list.items.length} item{list.items.length !== 1 ? "s" : ""}
                                                    {!isExpanded && list.items.length > 0 && (
                                                        <span className="ml-2 hidden sm:inline">
                                                            • {list.items.slice(0, 3).map(item => item.food_label).join(", ")}
                                                            {list.items.length > 3 && "..."}
                                                        </span>
                                                    )}
                                                </Text>
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                            {isExpanded && listSelected.size > 0 && (
                                                <Button
                                                    onClick={() => handleBulkRemoveItems(list.id)}
                                                    disabled={removingItemIds.size > 0}
                                                    color="red"
                                                    className="text-xs sm:text-sm"
                                                >
                                                    Remove ({listSelected.size})
                                                </Button>
                                            )}
                                            <Dropdown>
                                                <DropdownButton 
                                                    plain
                                                    className="p-2"
                                                    aria-label="List options"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </DropdownButton>
                                                <DropdownMenu anchor="bottom end" className="min-w-40">
                                                    <DropdownItem 
                                                        onClick={() => setAddItemDialogListId(list.id)}
                                                    >
                                                        <Plus className="h-4 w-4" data-slot="icon" />
                                                        <DropdownLabel>Add Item</DropdownLabel>
                                                    </DropdownItem>
                                                    <DropdownDivider />
                                                    <DropdownItem 
                                                        onClick={() => handleSendEmail(list.id)}
                                                        disabled={sendingEmailListId === list.id || list.items.length === 0}
                                                    >
                                                        <Mail className="h-4 w-4" data-slot="icon" />
                                                        <DropdownLabel>
                                                            {sendingEmailListId === list.id ? "Sending..." : "Email"}
                                                        </DropdownLabel>
                                                    </DropdownItem>
                                                    <DropdownItem 
                                                        onClick={() => openRenameDialog(list)}
                                                    >
                                                        <Pencil className="h-4 w-4" data-slot="icon" />
                                                        <DropdownLabel>Rename</DropdownLabel>
                                                    </DropdownItem>
                                                    <DropdownDivider />
                                                    <DropdownItem 
                                                        onClick={() => setIsDeleteDialogOpen(list.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" data-slot="icon" />
                                                        <DropdownLabel>Delete</DropdownLabel>
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </div>
                                    </div>

                                    {/* List Content - Collapsible */}
                                    <div
                                        className={`overflow-hidden transition-all duration-200 ${
                                            isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                                        }`}
                                    >
                                        <div className="border-t border-zinc-950/10 p-4 dark:border-white/10">
                                            {list.items.length === 0 ? (
                                                <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/50">
                                                    <Text className="text-zinc-600 dark:text-zinc-400">
                                                        This list is empty. Use the "Add Item" button to add custom items, or add items from the Food Database!
                                                    </Text>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableHeader className="w-12">
                                                                    <Checkbox
                                                                        checked={allSelected}
                                                                        onChange={() => toggleAllItemsInList(list.id, itemIds)}
                                                                    />
                                                                </TableHeader>
                                                                <TableHeader>Food Name</TableHeader>
                                                                <TableHeader>Brand</TableHeader>
                                                                <TableHeader>Quantity</TableHeader>
                                                                <TableHeader>Actions</TableHeader>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {list.items.map((item) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell>
                                                                        <Checkbox
                                                                            checked={listSelected.has(item.id)}
                                                                            onChange={() => toggleItemSelection(list.id, item.id)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {item.food_id.startsWith("ingredient_") || item.food_id.startsWith("custom_") ? (
                                                                            <span className="font-medium">
                                                                                {item.food_label}
                                                                            </span>
                                                                        ) : (
                                                                            <Link
                                                                                href={`/dashboard/food-database/${encodeURIComponent(item.food_id)}`}
                                                                                className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                                                            >
                                                                                {item.food_label}
                                                                            </Link>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {item.food_data?.brand || (
                                                                            <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <Button
                                                                                onClick={() => handleUpdateQuantity(list.id, item.id, -1)}
                                                                                disabled={updatingQuantityIds.has(item.id) || parseFloat(String(item.quantity)) <= 1}
                                                                                outline
                                                                                className="flex h-10 w-10 items-center justify-center p-0 sm:h-8 sm:w-8"
                                                                            >
                                                                                <Minus className="size-7 sm:size-4" />
                                                                            </Button>
                                                                            <span className="min-w-[3rem] text-center font-medium">
                                                                                {(() => {
                                                                                    const qty = parseFloat(String(item.quantity));
                                                                                    return Number.isInteger(qty) ? qty : qty.toFixed(2);
                                                                                })()}
                                                                            </span>
                                                                            <Button
                                                                                onClick={() => handleUpdateQuantity(list.id, item.id, 1)}
                                                                                disabled={updatingQuantityIds.has(item.id)}
                                                                                outline
                                                                                className="flex h-10 w-10 items-center justify-center p-0 sm:h-8 sm:w-8"
                                                                            >
                                                                                <Plus className="size-7 sm:size-4" />
                                                                            </Button>
                                                                            {(item.unit || item.food_data?.unit) && (
                                                                                <span className="text-zinc-500 dark:text-zinc-400">
                                                                                    {item.unit || item.food_data?.unit}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Button
                                                                            onClick={() => handleRemoveItem(list.id, item.id)}
                                                                            disabled={removingItemIds.has(item.id)}
                                                                            color="red"
                                                                            className="text-sm"
                                                                        >
                                                                            {removingItemIds.has(item.id) ? "Removing..." : "Remove"}
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Create List Dialog */}
                <Dialog open={isCreateDialogOpen} onClose={setIsCreateDialogOpen}>
                    <DialogTitle>Create New Grocery List</DialogTitle>
                    <DialogDescription>
                        Give your new grocery list a name.
                    </DialogDescription>
                    <DialogBody>
                        <Field>
                            <FieldLabel>List Name</FieldLabel>
                            <Input
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                placeholder="e.g., Weekly Shopping"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleCreateList();
                                    }
                                }}
                            />
                        </Field>
                    </DialogBody>
                    <DialogActions>
                        <Button plain onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateList} disabled={isCreating || !newListName.trim()}>
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Rename List Dialog */}
                {isRenameDialogOpen !== null && (
                    <Dialog open={isRenameDialogOpen !== null} onClose={() => setIsRenameDialogOpen(null)}>
                        <DialogTitle>Rename Grocery List</DialogTitle>
                        <DialogDescription>
                            Enter a new name for this grocery list.
                        </DialogDescription>
                        <DialogBody>
                            <Field>
                                <FieldLabel>List Name</FieldLabel>
                                <Input
                                    type="text"
                                    value={renameListName}
                                    onChange={(e) => setRenameListName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleRenameList(isRenameDialogOpen);
                                        }
                                    }}
                                />
                            </Field>
                        </DialogBody>
                        <DialogActions>
                            <Button plain onClick={() => setIsRenameDialogOpen(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleRenameList(isRenameDialogOpen)}
                                disabled={isRenaming || !renameListName.trim()}
                            >
                                {isRenaming ? "Renaming..." : "Rename"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

                {/* Delete List Dialog */}
                {isDeleteDialogOpen !== null && (
                    <Dialog open={isDeleteDialogOpen !== null} onClose={() => setIsDeleteDialogOpen(null)}>
                        <DialogTitle>Delete Grocery List</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this grocery list? This action cannot be undone.
                        </DialogDescription>
                        <DialogBody>
                            <Text>
                                All items in this list will be permanently deleted.
                            </Text>
                        </DialogBody>
                        <DialogActions>
                            <Button plain onClick={() => setIsDeleteDialogOpen(null)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleDeleteList(isDeleteDialogOpen)}
                                disabled={isDeleting}
                                color="red"
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}

                {/* Email Result Dialog */}
                <Dialog open={emailResultDialog.isOpen} onClose={() => setEmailResultDialog({ isOpen: false, message: "", isError: false })}>
                    <DialogTitle>{emailResultDialog.isError ? "Error Sending Email" : "Email Sent"}</DialogTitle>
                    <DialogBody>
                        <Text>{emailResultDialog.message}</Text>
                    </DialogBody>
                    <DialogActions>
                        <Button onClick={() => setEmailResultDialog({ isOpen: false, message: "", isError: false })}>
                            OK
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Add Custom Item Dialog */}
                <Dialog 
                    open={addItemDialogListId !== null} 
                    onClose={() => {
                        setAddItemDialogListId(null);
                        setNewItemName("");
                        setNewItemQuantity("1");
                        setNewItemUnit("");
                    }}
                >
                    <DialogTitle>Add Item to List</DialogTitle>
                    <DialogDescription>
                        Add a custom item to your grocery list. If an item with the same name already exists, the quantity will be added to it.
                    </DialogDescription>
                    <DialogBody>
                        <div className="space-y-4">
                            <Field>
                                <FieldLabel>Item Name</FieldLabel>
                                <Input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="e.g., Milk, Eggs, Bread"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && addItemDialogListId !== null) {
                                            handleAddCustomItem(addItemDialogListId);
                                        }
                                    }}
                                />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel>Quantity</FieldLabel>
                                    <Input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={newItemQuantity}
                                        onChange={(e) => setNewItemQuantity(e.target.value)}
                                        placeholder="1"
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Unit (optional)</FieldLabel>
                                    <Input
                                        type="text"
                                        value={newItemUnit}
                                        onChange={(e) => setNewItemUnit(e.target.value)}
                                        placeholder="e.g., lbs, oz, cups"
                                    />
                                </Field>
                            </div>
                        </div>
                    </DialogBody>
                    <DialogActions>
                        <Button 
                            plain 
                            onClick={() => {
                                setAddItemDialogListId(null);
                                setNewItemName("");
                                setNewItemQuantity("1");
                                setNewItemUnit("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={() => addItemDialogListId !== null && handleAddCustomItem(addItemDialogListId)} 
                            disabled={isAddingItem || !newItemName.trim()}
                        >
                            {isAddingItem ? "Adding..." : "Add Item"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </SidebarLayout>
    );
};

export default GroceryLists;
