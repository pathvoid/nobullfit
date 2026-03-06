import useHelmet from "@hooks/useHelmet.js";
import { useLoaderData } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Input } from "@components/input";
import { Button } from "@components/button";
import { Badge } from "@components/badge";
import { Field, Label } from "@components/fieldset";
import { Radio, RadioField, RadioGroup } from "@components/radio";
import { Dialog, DialogActions, DialogBody, DialogTitle } from "@components/dialog";
import { Divider } from "@components/divider";
import AdminSidebar from "./AdminSidebar.js";
import { toast } from "sonner";
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon,
    Heading2,
    Eye,
    Send,
    X,
    Search
} from "lucide-react";

// TipTap imports - only loaded client-side
let useEditor: typeof import("@tiptap/react").useEditor | null = null;
let EditorContent: typeof import("@tiptap/react").EditorContent | null = null;
let StarterKit: typeof import("@tiptap/starter-kit").default | null = null;
let TipTapLink: typeof import("@tiptap/extension-link").default | null = null;
let TipTapUnderline: typeof import("@tiptap/extension-underline").default | null = null;
let TextAlign: typeof import("@tiptap/extension-text-align").default | null = null;
let Placeholder: typeof import("@tiptap/extension-placeholder").default | null = null;

// Lazy load TipTap only on client side
if (typeof window !== "undefined") {
    import("@tiptap/react").then(mod => {
        useEditor = mod.useEditor;
        EditorContent = mod.EditorContent;
    });
    import("@tiptap/starter-kit").then(mod => { StarterKit = mod.default; });
    import("@tiptap/extension-link").then(mod => { TipTapLink = mod.default; });
    import("@tiptap/extension-underline").then(mod => { TipTapUnderline = mod.default; });
    import("@tiptap/extension-text-align").then(mod => { TextAlign = mod.default; });
    import("@tiptap/extension-placeholder").then(mod => { Placeholder = mod.default; });
}

interface UserResult {
    id: number;
    email: string;
    full_name: string;
}

// TipTap toolbar button
function ToolbarButton({ active, onClick, children, title }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded transition-colors ${
                active
                    ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            }`}
        >
            {children}
        </button>
    );
}

// The editor wrapper component (only renders client-side)
function EmailEditor({ onContentChange }: { onContentChange: (html: string) => void }) {
    const [editorReady, setEditorReady] = useState(false);
    const [editor, setEditor] = useState<ReturnType<NonNullable<typeof useEditor>> | null>(null);

    useEffect(() => {
        // Wait for TipTap to be loaded
        const checkReady = setInterval(() => {
            if (useEditor && EditorContent && StarterKit && TipTapLink && TipTapUnderline && TextAlign && Placeholder) {
                setEditorReady(true);
                clearInterval(checkReady);
            }
        }, 50);
        return () => clearInterval(checkReady);
    }, []);

    useEffect(() => {
        if (!editorReady || !StarterKit || !TipTapLink || !TipTapUnderline || !TextAlign || !Placeholder) return;

        // Dynamic import to create editor instance
        import("@tiptap/react").then(({ Editor }) => {
            const ed = new Editor({
                extensions: [
                    StarterKit!.configure({
                        heading: { levels: [2, 3] }
                    }),
                    TipTapLink!.configure({
                        openOnClick: false,
                        HTMLAttributes: { style: "color: #27272a; text-decoration: underline;" }
                    }),
                    TipTapUnderline!,
                    TextAlign!.configure({ types: ["heading", "paragraph"] }),
                    Placeholder!.configure({ placeholder: "Write your email content here..." })
                ],
                editorProps: {
                    attributes: {
                        class: "prose prose-sm dark:prose-invert max-w-none min-h-[200px] p-4 focus:outline-none"
                    }
                },
                onUpdate: ({ editor: e }) => {
                    onContentChange(e.getHTML());
                }
            });
            setEditor(ed);
        });

        return () => {
            editor?.destroy();
        };
    }, [editorReady]);

    // Update parent when editor content changes
    useEffect(() => {
        if (!editor) return;
        const handler = () => onContentChange(editor.getHTML());
        editor.on("update", handler);
        return () => { editor.off("update", handler); };
    }, [editor, onContentChange]);

    if (!editorReady || !editor || !EditorContent) {
        return (
            <div className="rounded-lg border border-zinc-300 dark:border-zinc-600 p-4 text-zinc-400">
                Loading editor...
            </div>
        );
    }

    const handleAddLink = () => {
        const url = window.prompt("Enter URL:");
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    return (
        <div className="rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-0.5 border-b border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                <ToolbarButton
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold"
                >
                    <Bold className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    title="Italic"
                >
                    <Italic className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    title="Underline"
                >
                    <UnderlineIcon className="size-4" />
                </ToolbarButton>

                <div className="mx-1 w-px bg-zinc-200 dark:bg-zinc-700" />

                <ToolbarButton
                    active={editor.isActive("heading", { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    title="Heading"
                >
                    <Heading2 className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Bullet List"
                >
                    <List className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    title="Ordered List"
                >
                    <ListOrdered className="size-4" />
                </ToolbarButton>

                <div className="mx-1 w-px bg-zinc-200 dark:bg-zinc-700" />

                <ToolbarButton
                    active={editor.isActive({ textAlign: "left" })}
                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                    title="Align Left"
                >
                    <AlignLeft className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive({ textAlign: "center" })}
                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                    title="Align Center"
                >
                    <AlignCenter className="size-4" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive({ textAlign: "right" })}
                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                    title="Align Right"
                >
                    <AlignRight className="size-4" />
                </ToolbarButton>

                <div className="mx-1 w-px bg-zinc-200 dark:bg-zinc-700" />

                <ToolbarButton
                    active={editor.isActive("link")}
                    onClick={handleAddLink}
                    title="Add Link"
                >
                    <LinkIcon className="size-4" />
                </ToolbarButton>
            </div>

            {/* Editor content */}
            <EditorContent editor={editor} />
        </div>
    );
}

const AdminEmails: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: Array<{ name: string; content: string }> };
    const helmet = useHelmet();
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [subject, setSubject] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [recipientType, setRecipientType] = useState<"selected" | "eligible" | "eligible_subscribed" | "eligible_unsubscribed">("eligible");
    const [eligibleCount, setEligibleCount] = useState<number | null>(null);
    const [eligibleSubscribedCount, setEligibleSubscribedCount] = useState<number | null>(null);
    const [eligibleUnsubscribedCount, setEligibleUnsubscribedCount] = useState<number | null>(null);

    // User search for selected recipients
    const [userSearch, setUserSearch] = useState("");
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<UserResult[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Dialog states
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewHtml, setPreviewHtml] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [sending, setSending] = useState(false);

    // Fetch eligible counts on mount
    useEffect(() => {
        fetch("/api/admin/emails/eligible-count")
            .then(res => res.json())
            .then(data => {
                setEligibleCount(data.count);
                setEligibleSubscribedCount(data.subscribedCount);
                setEligibleUnsubscribedCount(data.unsubscribedCount);
            })
            .catch(() => {
                setEligibleCount(null);
                setEligibleSubscribedCount(null);
                setEligibleUnsubscribedCount(null);
            });
    }, []);

    // Debounced user search
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!userSearch.trim()) {
            setSearchResults([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=10`);
                const data = await res.json();
                // Filter out already selected users
                const selectedIds = new Set(selectedUsers.map(u => u.id));
                setSearchResults(data.users.filter((u: UserResult) => !selectedIds.has(u.id)));
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [userSearch, selectedUsers]);

    const addUser = (user: UserResult) => {
        setSelectedUsers(prev => [...prev, user]);
        setSearchResults(prev => prev.filter(u => u.id !== user.id));
        setUserSearch("");
    };

    const removeUser = (userId: number) => {
        setSelectedUsers(prev => prev.filter(u => u.id !== userId));
    };

    const handlePreview = async () => {
        if (!subject || !htmlContent) {
            toast.error("Please enter a subject and content");
            return;
        }

        try {
            const res = await fetch("/api/admin/emails/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, htmlContent, recipientType })
            });
            const data = await res.json();
            setPreviewHtml(data.html);
            setPreviewOpen(true);
        } catch {
            toast.error("Failed to generate preview");
        }
    };

    const handleSendClick = () => {
        if (!subject || !htmlContent) {
            toast.error("Please enter a subject and content");
            return;
        }
        if (recipientType === "selected" && selectedUsers.length === 0) {
            toast.error("Please select at least one recipient");
            return;
        }
        setConfirmOpen(true);
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const res = await fetch("/api/admin/emails/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject,
                    htmlContent,
                    recipientType,
                    recipientIds: recipientType === "selected" ? selectedUsers.map(u => u.id) : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setConfirmOpen(false);
            toast.success(`Email sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} failed)` : ""}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send email");
        } finally {
            setSending(false);
        }
    };

    const recipientCount = recipientType === "eligible"
        ? eligibleCount ?? 0
        : recipientType === "eligible_subscribed"
            ? eligibleSubscribedCount ?? 0
            : recipientType === "eligible_unsubscribed"
                ? eligibleUnsubscribedCount ?? 0
                : selectedUsers.length;

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
            <div className="max-w-4xl space-y-6">
                <div>
                    <Heading level={1}>Send Email</Heading>
                    <Text className="mt-1 text-zinc-600 dark:text-zinc-400">
                        Compose and send marketing emails to your users.
                    </Text>
                </div>

                <Divider />

                {/* Recipients */}
                <div className="space-y-4">
                    <Field>
                        <Label>Recipients</Label>
                        <RadioGroup
                            value={recipientType}
                            onChange={(val) => setRecipientType(val as "selected" | "eligible" | "eligible_subscribed" | "eligible_unsubscribed")}
                            className="mt-2"
                        >
                            <RadioField>
                                <Radio value="eligible" />
                                <Label>
                                    All eligible users
                                    {eligibleCount !== null && (
                                        <Badge color="blue" className="ml-2">{eligibleCount}</Badge>
                                    )}
                                </Label>
                            </RadioField>
                            <RadioField>
                                <Radio value="eligible_subscribed" />
                                <Label>
                                    All eligible users with subscription
                                    {eligibleSubscribedCount !== null && (
                                        <Badge color="green" className="ml-2">{eligibleSubscribedCount}</Badge>
                                    )}
                                </Label>
                            </RadioField>
                            <RadioField>
                                <Radio value="eligible_unsubscribed" />
                                <Label>
                                    All eligible users without subscription
                                    {eligibleUnsubscribedCount !== null && (
                                        <Badge color="zinc" className="ml-2">{eligibleUnsubscribedCount}</Badge>
                                    )}
                                </Label>
                            </RadioField>
                            <RadioField>
                                <Radio value="selected" />
                                <Label>Selected users</Label>
                            </RadioField>
                        </RadioGroup>
                    </Field>

                    {recipientType === "selected" && (
                        <div className="space-y-3">
                            {/* Selected user chips */}
                            {selectedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map(user => (
                                        <span
                                            key={user.id}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 py-1 pl-3 pr-1.5 text-sm text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                                        >
                                            {user.full_name}
                                            <button
                                                type="button"
                                                onClick={() => removeUser(user.id)}
                                                className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* User search */}
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search className="size-4 text-zinc-400" />
                                </div>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search users by name or email..."
                                    className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                                />
                                {/* Search results dropdown */}
                                {(searchResults.length > 0 || searching) && userSearch && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                                        {searching ? (
                                            <div className="px-4 py-3 text-sm text-zinc-500">Searching...</div>
                                        ) : (
                                            searchResults.map(user => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    onClick={() => addUser(user)}
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
                        </div>
                    )}
                </div>

                <Divider />

                {/* Subject */}
                <Field>
                    <Label>Subject</Label>
                    <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter email subject..."
                    />
                </Field>

                {/* Editor */}
                <div>
                    <label className="block text-sm font-medium text-zinc-950 dark:text-white mb-2">Content</label>
                    <EmailEditor onContentChange={setHtmlContent} />
                </div>

                <Divider />

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button onClick={handlePreview} outline>
                        <Eye className="size-4" data-slot="icon" />
                        Preview
                    </Button>
                    <Button onClick={handleSendClick}>
                        <Send className="size-4" data-slot="icon" />
                        Send Email
                    </Button>
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} size="3xl">
                <DialogTitle>Email Preview</DialogTitle>
                <DialogBody>
                    <iframe
                        srcDoc={previewHtml}
                        className="w-full h-[500px] rounded border border-zinc-200 bg-white dark:border-zinc-700"
                        title="Email Preview"
                    />
                </DialogBody>
                <DialogActions>
                    <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Confirm Send Dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirm Send</DialogTitle>
                <DialogBody>
                    <Text>
                        You are about to send this email to <strong>{recipientCount}</strong> recipient{recipientCount !== 1 ? "s" : ""}.
                        This action cannot be undone.
                    </Text>
                </DialogBody>
                <DialogActions>
                    <Button plain onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={sending}>
                        {sending ? "Sending..." : `Send to ${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}`}
                    </Button>
                </DialogActions>
            </Dialog>
        </SidebarLayout>
    );
};

export default AdminEmails;
