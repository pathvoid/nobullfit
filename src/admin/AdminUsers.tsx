import useHelmet from "@hooks/useHelmet.js";
import { useLoaderData } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Badge } from "@components/badge";
import { Input } from "@components/input";
import { Select } from "@components/select";
import { Button } from "@components/button";
import { Dropdown, DropdownButton, DropdownItem, DropdownLabel, DropdownMenu } from "@components/dropdown";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@components/dialog";
import { Field, Label } from "@components/fieldset";

import { Skeleton } from "@components/skeleton";
import AdminSidebar from "./AdminSidebar.js";
import { MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
    id: number;
    email: string;
    full_name: string;
    plan: string | null;
    subscribed: boolean;
    subscribed_at: string | null;
    paddle_customer_id: string | null;
    paddle_subscription_id: string | null;
    subscription_status: string | null;
    subscription_ends_at: string | null;
    subscription_canceled_at: string | null;
    created_at: string;
    updated_at: string;
}

// Badge color based on subscription status
function getStatusColor(status: string | null): "green" | "yellow" | "red" | "orange" | "blue" | "zinc" {
    switch (status) {
        case "active": return "green";
        case "trialing": return "blue";
        case "paused": return "yellow";
        case "past_due": return "orange";
        case "canceled": return "red";
        default: return "zinc";
    }
}

// Format date for display
function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

// Generate pagination page numbers with gaps
function getPageNumbers(currentPage: number, totalPages: number): (number | "gap")[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "gap")[] = [1];

    if (currentPage > 3) {
        pages.push("gap");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
        pages.push(i);
    }

    if (currentPage < totalPages - 2) {
        pages.push("gap");
    }

    if (totalPages > 1) {
        pages.push(totalPages);
    }

    return pages;
}

const AdminUsers: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: Array<{ name: string; content: string }> };
    const helmet = useHelmet();
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const limit = 20;

    // Edit dialog state
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState({
        full_name: "",
        email: "",
        plan: "",
        subscribed: "false",
        subscription_status: "",
        subscription_ends_at: "",
        paddle_customer_id: "",
        paddle_subscription_id: ""
    });
    const [saving, setSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (search) params.set("search", search);

            const response = await fetch(`/api/admin/users?${params}`);
            if (!response.ok) throw new Error("Failed to fetch users");

            const data = await response.json();
            setUsers(data.users);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Error fetching users:", err);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const openEditDialog = (user: AdminUser) => {
        setEditingUser(user);
        setEditForm({
            full_name: user.full_name || "",
            email: user.email || "",
            plan: user.plan || "",
            subscribed: user.subscribed ? "true" : "false",
            subscription_status: user.subscription_status || "",
            subscription_ends_at: user.subscription_ends_at ? user.subscription_ends_at.split("T")[0] : "",
            paddle_customer_id: user.paddle_customer_id || "",
            paddle_subscription_id: user.paddle_subscription_id || ""
        });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setSaving(true);

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: editForm.full_name,
                    email: editForm.email,
                    plan: editForm.plan || null,
                    subscribed: editForm.subscribed === "true",
                    subscription_status: editForm.subscription_status || null,
                    subscription_ends_at: editForm.subscription_ends_at || null,
                    paddle_customer_id: editForm.paddle_customer_id || null,
                    paddle_subscription_id: editForm.paddle_subscription_id || null
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to update user");
            }

            const data = await response.json();
            // Update user in the list
            setUsers(prev => prev.map(u => u.id === editingUser.id ? data.user : u));
            setEditingUser(null);
            toast.success("User updated successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update user");
        } finally {
            setSaving(false);
        }
    };

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo href="/admin" className="text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                </Navbar>
            }
            sidebar={<AdminSidebar />}
        >
            <div className="space-y-6">
                <div>
                    <Heading level={1}>Users</Heading>
                    <Text className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {total} user{total !== 1 ? "s" : ""} total
                    </Text>
                </div>

                {/* Search */}
                <div className="max-w-sm">
                    <Input
                        type="search"
                        placeholder="Search by name or email..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>

                {/* Table */}
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} variant="text" className="h-10 w-full" />
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <Heading level={2}>No Users Found</Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            {search ? "Try a different search term." : "No users in the database."}
                        </Text>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden">
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeader className="min-w-48">Name</TableHeader>
                                                <TableHeader className="min-w-48">Email</TableHeader>
                                                <TableHeader className="hidden sm:table-cell min-w-20">Plan</TableHeader>
                                                <TableHeader className="hidden sm:table-cell min-w-28">Status</TableHeader>
                                                <TableHeader className="hidden md:table-cell min-w-28">Created</TableHeader>
                                                <TableHeader className="min-w-12 text-right"></TableHeader>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {users.map((user) => (
                                                <TableRow key={user.id}>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="font-medium">{user.full_name}</span>
                                                            <div className="sm:hidden text-sm text-zinc-500 dark:text-zinc-400">
                                                                {user.plan || "No plan"}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        {user.plan ? (
                                                            <Badge color={user.plan === "pro" ? "purple" : "zinc"}>
                                                                {user.plan}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        {user.subscription_status ? (
                                                            <Badge color={getStatusColor(user.subscription_status)}>
                                                                {user.subscription_status}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-zinc-400 dark:text-zinc-500">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {formatDate(user.created_at)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end">
                                                            <Dropdown>
                                                                <DropdownButton
                                                                    plain
                                                                    className="p-2"
                                                                    aria-label="User options"
                                                                >
                                                                    <MoreVertical className="h-5 w-5" />
                                                                </DropdownButton>
                                                                <DropdownMenu anchor="bottom end" className="min-w-40">
                                                                    <DropdownItem onClick={() => openEditDialog(user)}>
                                                                        <Pencil className="h-4 w-4" data-slot="icon" />
                                                                        <DropdownLabel>Edit User</DropdownLabel>
                                                                    </DropdownItem>
                                                                </DropdownMenu>
                                                            </Dropdown>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between">
                                <Button
                                    outline
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                >
                                    Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                    {getPageNumbers(page, totalPages).map((p, i) =>
                                        p === "gap" ? (
                                            <span key={`gap-${i}`} className="px-2 text-zinc-400">&hellip;</span>
                                        ) : (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setPage(p)}
                                                className={`min-w-[2rem] rounded px-2 py-1 text-sm font-medium ${
                                                    p === page
                                                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                </div>
                                <Button
                                    outline
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(page + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Edit User Dialog */}
            <Dialog open={editingUser !== null} onClose={() => setEditingUser(null)} size="lg">
                <DialogTitle>Edit User</DialogTitle>
                <DialogBody>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field>
                            <Label>Full Name</Label>
                            <Input
                                value={editForm.full_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                            />
                        </Field>
                        <Field>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </Field>
                        <Field>
                            <Label>Plan</Label>
                            <Select
                                value={editForm.plan}
                                onChange={(e) => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                            >
                                <option value="">No plan</option>
                                <option value="free">Free</option>
                                <option value="pro">Pro</option>
                            </Select>
                        </Field>
                        <Field>
                            <Label>Subscribed</Label>
                            <Select
                                value={editForm.subscribed}
                                onChange={(e) => setEditForm(prev => ({ ...prev, subscribed: e.target.value }))}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </Select>
                        </Field>
                        <Field>
                            <Label>Subscription Status</Label>
                            <Select
                                value={editForm.subscription_status}
                                onChange={(e) => setEditForm(prev => ({ ...prev, subscription_status: e.target.value }))}
                            >
                                <option value="">None</option>
                                <option value="active">Active</option>
                                <option value="trialing">Trialing</option>
                                <option value="paused">Paused</option>
                                <option value="past_due">Past Due</option>
                                <option value="canceled">Canceled</option>
                            </Select>
                        </Field>
                        <Field>
                            <Label>Subscription Ends At</Label>
                            <Input
                                type="date"
                                value={editForm.subscription_ends_at}
                                onChange={(e) => setEditForm(prev => ({ ...prev, subscription_ends_at: e.target.value }))}
                            />
                        </Field>
                        <Field>
                            <Label>Paddle Customer ID</Label>
                            <Input
                                value={editForm.paddle_customer_id}
                                onChange={(e) => setEditForm(prev => ({ ...prev, paddle_customer_id: e.target.value }))}
                            />
                        </Field>
                        <Field>
                            <Label>Paddle Subscription ID</Label>
                            <Input
                                value={editForm.paddle_subscription_id}
                                onChange={(e) => setEditForm(prev => ({ ...prev, paddle_subscription_id: e.target.value }))}
                            />
                        </Field>
                    </div>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogActions>
            </Dialog>
        </SidebarLayout>
    );
};

export default AdminUsers;
