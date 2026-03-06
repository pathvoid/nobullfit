import useHelmet from "@hooks/useHelmet.js";
import { useLoaderData } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading, Subheading } from "@components/heading";
import { Text } from "@components/text";
import { Divider } from "@components/divider";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@components/description-list";
import { Skeleton } from "@components/skeleton";
import AdminSidebar from "./AdminSidebar.js";

// Admin stats shape from the API
interface AdminStats {
    users: {
        total: number;
        this_week: number;
        this_month: number;
        active_last_7_days: number;
    };
    food_tracking: { total_entries: number };
    recipes: { total: number };
    progress_tracking: { total_entries: number };
    reminders: { total: number; active: number };
    integrations: { total: number };
    grocery_lists: { total: number };
    favorites: { total: number };
}

const AdminPanel: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: Array<{ name: string; content: string }> };
    const helmet = useHelmet();
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/admin/stats");
            if (!response.ok) {
                throw new Error("Failed to fetch admin stats");
            }
            const data = await response.json();
            setStats(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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
            <div className="max-w-4xl">
                <Heading>Admin Overview</Heading>
                <Text className="mt-1">Platform-wide statistics for NoBullFit.</Text>

                {error && (
                    <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <Text className="text-red-600 dark:text-red-400">{error}</Text>
                    </div>
                )}

                {loading && (
                    <div className="mt-8 space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} variant="text" className="h-5 w-full" />
                        ))}
                    </div>
                )}

                {stats && !loading && (
                    <>
                        <Subheading className="mt-8">Users</Subheading>
                        <DescriptionList className="mt-4">
                            <DescriptionTerm>Total Users</DescriptionTerm>
                            <DescriptionDetails>{stats.users.total.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>Active Users</DescriptionTerm>
                            <DescriptionDetails>{stats.users.active_last_7_days.toLocaleString()} <span className="text-zinc-500">(last 7 days)</span></DescriptionDetails>

                            <DescriptionTerm>New This Week</DescriptionTerm>
                            <DescriptionDetails>{stats.users.this_week.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>New This Month</DescriptionTerm>
                            <DescriptionDetails>{stats.users.this_month.toLocaleString()}</DescriptionDetails>
                        </DescriptionList>

                        <Subheading className="mt-8">Content &amp; Activity</Subheading>
                        <DescriptionList className="mt-4">
                            <DescriptionTerm>Food Entries</DescriptionTerm>
                            <DescriptionDetails>{stats.food_tracking.total_entries.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>Recipes</DescriptionTerm>
                            <DescriptionDetails>{stats.recipes.total.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>Activities Logged</DescriptionTerm>
                            <DescriptionDetails>{stats.progress_tracking.total_entries.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>Reminders</DescriptionTerm>
                            <DescriptionDetails>{stats.reminders.total.toLocaleString()} <span className="text-zinc-500">({stats.reminders.active} active)</span></DescriptionDetails>
                        </DescriptionList>

                        <Subheading className="mt-8">Features</Subheading>
                        <DescriptionList className="mt-4">
                            <DescriptionTerm>Grocery Lists</DescriptionTerm>
                            <DescriptionDetails>{stats.grocery_lists.total.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>Favorites</DescriptionTerm>
                            <DescriptionDetails>{stats.favorites.total.toLocaleString()}</DescriptionDetails>

                            <DescriptionTerm>Integrations</DescriptionTerm>
                            <DescriptionDetails>{stats.integrations.total.toLocaleString()}</DescriptionDetails>
                        </DescriptionList>
                    </>
                )}
            </div>
        </SidebarLayout>
    );
};

export default AdminPanel;
