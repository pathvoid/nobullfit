import useHelmet from "@hooks/useHelmet.js";
import { useLoaderData } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
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
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@components/dialog";
import { Field, Label } from "@components/fieldset";
import { Skeleton } from "@components/skeleton";
import { Pagination, PaginationGap, PaginationList, PaginationNext, PaginationPage, PaginationPrevious } from "@components/pagination";
import AdminSidebar from "./AdminSidebar.js";
import { toast } from "sonner";
import { Search, X } from "lucide-react";

interface SystemLog {
    id: number;
    level: string;
    action: string;
    message: string;
    user_id: number | null;
    user_email: string | null;
    method: string | null;
    endpoint: string | null;
    status_code: number | null;
    duration_ms: number | null;
    error_stack: string | null;
    metadata: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

interface SelectedUser {
    id: number;
    full_name: string;
    email: string;
}

interface UserSearchResult {
    id: number;
    full_name: string;
    email: string;
}

// Badge color based on log level
function getLevelColor(level: string): "green" | "yellow" | "red" {
    switch (level) {
        case "info": return "green";
        case "warn": return "yellow";
        case "error": return "red";
        default: return "green";
    }
}

// Badge color based on status code
function getStatusColor(code: number | null): "green" | "yellow" | "red" | "zinc" {
    if (code === null) return "zinc";
    if (code >= 500) return "red";
    if (code >= 400) return "yellow";
    if (code >= 200 && code < 300) return "green";
    return "zinc";
}

// Format timestamp for display
function formatTimestamp(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
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

const AdminLogs: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: Array<{ name: string; content: string }> };
    const helmet = useHelmet();
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Log data state
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [availableActions, setAvailableActions] = useState<string[]>([]);

    // Filter state
    const [level, setLevel] = useState("");
    const [action, setAction] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [date, setDate] = useState("");

    // User selection state
    const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
    const [userSearch, setUserSearch] = useState("");
    const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const userSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detail dialog state
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

    // Fetch logs from API
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: String(page), limit: "100" });
            if (level) params.set("level", level);
            if (action) params.set("action", action);
            if (search) params.set("search", search);
            if (date) params.set("date", date);
            if (selectedUser) params.set("user_id", String(selectedUser.id));

            const response = await fetch(`/api/admin/logs?${params}`);
            if (!response.ok) throw new Error("Failed to fetch logs");

            const data = await response.json();
            setLogs(data.logs);
            setAvailableActions(data.actions);
            setTotal(data.total);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Error fetching logs:", err);
            toast.error("Failed to load logs");
        } finally {
            setLoading(false);
        }
    }, [page, level, action, search, date, selectedUser]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Debounced search for log messages/emails
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Debounced user search
    useEffect(() => {
        if (userSearchTimeout.current) clearTimeout(userSearchTimeout.current);

        if (!userSearch.trim()) {
            setUserSearchResults([]);
            return;
        }

        userSearchTimeout.current = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=10`);
                const data = await res.json();
                setUserSearchResults(data.users || []);
            } catch {
                setUserSearchResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);
    }, [userSearch]);

    // Select a user to filter logs
    const selectUser = (user: UserSearchResult) => {
        setSelectedUser({ id: user.id, full_name: user.full_name, email: user.email });
        setUserSearch("");
        setUserSearchResults([]);
        setPage(1);
    };

    // Clear user selection
    const clearUser = () => {
        setSelectedUser(null);
        setPage(1);
    };

    // Reset filters when level, action, or date changes
    const handleLevelChange = (value: string) => {
        setLevel(value);
        setPage(1);
    };

    const handleActionChange = (value: string) => {
        setAction(value);
        setPage(1);
    };

    const handleDateChange = (value: string) => {
        setDate(value);
        setPage(1);
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
                {/* Header */}
                <div>
                    <Heading level={1}>
                        {selectedUser ? `Logs for ${selectedUser.full_name}` : "System Logs"}
                    </Heading>
                    <Text className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {selectedUser ? (
                            <span className="flex items-center gap-2">
                                {selectedUser.email} — {total} log{total !== 1 ? "s" : ""}
                                <button
                                    type="button"
                                    onClick={clearUser}
                                    className="inline-flex items-center gap-1 rounded-full bg-zinc-100 py-0.5 pl-2 pr-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                                >
                                    Clear
                                    <X className="size-3" />
                                </button>
                            </span>
                        ) : (
                            `${total} log${total !== 1 ? "s" : ""} total`
                        )}
                    </Text>
                </div>

                {/* User search */}
                {!selectedUser && (
                    <div className="relative max-w-sm">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="size-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Find user logs by name or email..."
                            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                        />
                        {(userSearchResults.length > 0 || searchingUsers) && userSearch && (
                            <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                                {searchingUsers ? (
                                    <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
                                ) : (
                                    userSearchResults.map(user => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => selectUser(user)}
                                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg"
                                        >
                                            <div>
                                                <div className="font-medium text-zinc-900 dark:text-white">{user.full_name}</div>
                                                <div className="text-zinc-500 dark:text-zinc-400">{user.email}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[200px] max-w-sm flex-1">
                        <Field>
                            <Label>Search</Label>
                            <Input
                                type="search"
                                placeholder="Search by email or message..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </Field>
                    </div>
                    <div className="w-32">
                        <Field>
                            <Label>Level</Label>
                            <Select value={level} onChange={(e) => handleLevelChange(e.target.value)}>
                                <option value="">All</option>
                                <option value="info">Info</option>
                                <option value="warn">Warn</option>
                                <option value="error">Error</option>
                            </Select>
                        </Field>
                    </div>
                    <div className="w-48">
                        <Field>
                            <Label>Action</Label>
                            <Select value={action} onChange={(e) => handleActionChange(e.target.value)}>
                                <option value="">All</option>
                                {availableActions.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </Select>
                        </Field>
                    </div>
                    <div className="w-40">
                        <Field>
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => handleDateChange(e.target.value)}
                            />
                        </Field>
                    </div>
                    {date && (
                        <Button plain onClick={() => handleDateChange("")}>
                            Clear date
                        </Button>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} variant="text" className="h-10 w-full" />
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <Heading level={2}>No Logs Found</Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            {search || level || action || date || selectedUser
                                ? "Try adjusting your filters."
                                : "No logs recorded yet."}
                        </Text>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden">
                                    <Table striped dense>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeader className="min-w-32">Time</TableHeader>
                                                <TableHeader className="min-w-16">Level</TableHeader>
                                                <TableHeader className="min-w-36">Action</TableHeader>
                                                <TableHeader className="hidden sm:table-cell min-w-16">Method</TableHeader>
                                                <TableHeader className="hidden md:table-cell min-w-40">Endpoint</TableHeader>
                                                <TableHeader className="hidden sm:table-cell min-w-16">Status</TableHeader>
                                                <TableHeader className="hidden lg:table-cell min-w-16">Duration</TableHeader>
                                                {!selectedUser && (
                                                    <TableHeader className="hidden md:table-cell min-w-36">User</TableHeader>
                                                )}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {logs.map((log) => (
                                                <TableRow
                                                    key={log.id}
                                                    className="cursor-pointer"
                                                    onClick={() => setSelectedLog(log)}
                                                >
                                                    <TableCell className="text-xs whitespace-nowrap">
                                                        {formatTimestamp(log.created_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge color={getLevelColor(log.level)}>
                                                            {log.level}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {log.action}
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        {log.method && (
                                                            <span className="text-xs font-mono font-medium">
                                                                {log.method}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell text-xs font-mono truncate max-w-[200px]">
                                                        {log.endpoint || "—"}
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell">
                                                        {log.status_code !== null ? (
                                                            <Badge color={getStatusColor(log.status_code)}>
                                                                {log.status_code}
                                                            </Badge>
                                                        ) : "—"}
                                                    </TableCell>
                                                    <TableCell className="hidden lg:table-cell text-xs whitespace-nowrap">
                                                        {log.duration_ms !== null ? `${log.duration_ms}ms` : "—"}
                                                    </TableCell>
                                                    {!selectedUser && (
                                                        <TableCell className="hidden md:table-cell text-xs truncate max-w-[200px]">
                                                            {log.user_email || "—"}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <Pagination className="mt-6">
                                <PaginationPrevious
                                    href={page > 1 ? "#" : undefined}
                                    onClick={(e: React.MouseEvent) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                                />
                                <PaginationList>
                                    {getPageNumbers(page, totalPages).map((p, i) =>
                                        p === "gap" ? (
                                            <PaginationGap key={`gap-${i}`} />
                                        ) : (
                                            <PaginationPage
                                                key={p}
                                                href="#"
                                                current={p === page}
                                                onClick={(e: React.MouseEvent) => { e.preventDefault(); setPage(p); }}
                                            >
                                                {p}
                                            </PaginationPage>
                                        )
                                    )}
                                </PaginationList>
                                <PaginationNext
                                    href={page < totalPages ? "#" : undefined}
                                    onClick={(e: React.MouseEvent) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
                                />
                            </Pagination>
                        )}
                    </>
                )}
            </div>

            {/* Log Detail Dialog */}
            <Dialog open={selectedLog !== null} onClose={() => setSelectedLog(null)} size="lg">
                <DialogTitle>Log Details</DialogTitle>
                <DialogBody>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Level</span>
                                    <div className="mt-1">
                                        <Badge color={getLevelColor(selectedLog.level)}>
                                            {selectedLog.level}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Action</span>
                                    <div className="mt-1 font-mono">{selectedLog.action}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Method</span>
                                    <div className="mt-1 font-mono">{selectedLog.method || "—"}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Endpoint</span>
                                    <div className="mt-1 font-mono text-xs break-all">{selectedLog.endpoint || "—"}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Status Code</span>
                                    <div className="mt-1">
                                        {selectedLog.status_code !== null ? (
                                            <Badge color={getStatusColor(selectedLog.status_code)}>
                                                {selectedLog.status_code}
                                            </Badge>
                                        ) : "—"}
                                    </div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Duration</span>
                                    <div className="mt-1">{selectedLog.duration_ms !== null ? `${selectedLog.duration_ms}ms` : "—"}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">User</span>
                                    <div className="mt-1">{selectedLog.user_email || "Anonymous"}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">User ID</span>
                                    <div className="mt-1">{selectedLog.user_id ?? "—"}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">IP Address</span>
                                    <div className="mt-1 font-mono text-xs">{selectedLog.ip_address || "—"}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-zinc-500 dark:text-zinc-400">Timestamp</span>
                                    <div className="mt-1 text-xs">{new Date(selectedLog.created_at).toLocaleString()}</div>
                                </div>
                            </div>

                            <div>
                                <span className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Message</span>
                                <div className="mt-1 rounded-lg bg-zinc-50 p-3 text-sm font-mono dark:bg-zinc-800">
                                    {selectedLog.message}
                                </div>
                            </div>

                            {selectedLog.error_stack && (
                                <div>
                                    <span className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Error Stack</span>
                                    <pre className="mt-1 overflow-x-auto rounded-lg bg-red-50 p-3 text-xs font-mono text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                        {selectedLog.error_stack}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <span className="font-medium text-sm text-zinc-500 dark:text-zinc-400">Metadata</span>
                                    <pre className="mt-1 overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs font-mono dark:bg-zinc-800">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setSelectedLog(null)}>Close</Button>
                </DialogActions>
            </Dialog>
        </SidebarLayout>
    );
};

export default AdminLogs;
