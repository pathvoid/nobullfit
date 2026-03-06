import useHelmet from "@hooks/useHelmet.js";
import { useLoaderData } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading, Subheading } from "@components/heading";
import { Text } from "@components/text";
import { Divider } from "@components/divider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@components/table";
import { Badge } from "@components/badge";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@components/description-list";
import { Select } from "@components/select";
import { Field, Label } from "@components/fieldset";
import { Skeleton } from "@components/skeleton";
import AdminSidebar from "./AdminSidebar.js";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Internal analytics types
interface TopEndpoint {
    endpoint: string;
    count: string;
    avg_duration_ms: string;
}

interface TopAction {
    action: string;
    count: string;
}

interface DailyCount {
    date: string;
    count: string;
}

interface InternalAnalytics {
    topEndpoints: TopEndpoint[];
    topActions: TopAction[];
    errorRate: { total: number; errors: number; rate: string };
    dailyRequests: DailyCount[];
    userSignups: DailyCount[];
    activeUsers: number;
}

// Search Console types
interface SCQuery {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface SCPage {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface SCDevice {
    device: string;
    clicks: number;
    impressions: number;
}

interface SearchConsoleData {
    topQueries: SCQuery[];
    topPages: SCPage[];
    overall: { clicks: number; impressions: number; ctr: number; position: number };
    devices: SCDevice[];
}

interface AnalyticsData {
    internal: InternalAnalytics;
    searchConsole: SearchConsoleData | null;
}

// Format large numbers with commas
function formatNumber(n: number | string): string {
    return Number(n).toLocaleString();
}

// Format date for display
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

// Shorten a full URL to just the path
function shortenUrl(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

const AdminAnalytics: React.FC = () => {
    const loaderData = useLoaderData() as { title: string; meta: Array<{ name: string; content: string }> };
    const helmet = useHelmet();
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState("28d");

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/admin/analytics?period=${period}`);
            if (!response.ok) throw new Error("Failed to fetch analytics");
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
            toast.error("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

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
            <div className="space-y-8">
                {/* Header + Period Selector */}
                <div className="flex items-start justify-between">
                    <div>
                        <Heading level={1}>Analytics</Heading>
                        <Text className="mt-1 text-zinc-600 dark:text-zinc-400">
                            Platform performance and search visibility.
                        </Text>
                    </div>
                    <div className="w-40">
                        <Field>
                            <Label>Period</Label>
                            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                                <option value="7d">Last 7 days</option>
                                <option value="28d">Last 28 days</option>
                                <option value="90d">Last 90 days</option>
                            </Select>
                        </Field>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <Text className="text-red-600 dark:text-red-400">{error}</Text>
                    </div>
                )}

                {loading && (
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} variant="text" className="h-5 w-full" />
                        ))}
                    </div>
                )}

                {data && !loading && (
                    <>
                        {/* Overview Stats */}
                        <div>
                            <Subheading>Overview</Subheading>
                            <DescriptionList className="mt-4">
                                <DescriptionTerm>Total Requests</DescriptionTerm>
                                <DescriptionDetails>{formatNumber(data.internal.errorRate.total)}</DescriptionDetails>

                                <DescriptionTerm>Active Users</DescriptionTerm>
                                <DescriptionDetails>{formatNumber(data.internal.activeUsers)}</DescriptionDetails>

                                <DescriptionTerm>Error Rate</DescriptionTerm>
                                <DescriptionDetails>
                                    {data.internal.errorRate.rate}%
                                    <span className="ml-2 text-zinc-500">
                                        ({formatNumber(data.internal.errorRate.errors)} errors)
                                    </span>
                                </DescriptionDetails>

                                <DescriptionTerm>New Signups</DescriptionTerm>
                                <DescriptionDetails>
                                    {formatNumber(data.internal.userSignups.reduce((sum, d) => sum + Number(d.count), 0))}
                                </DescriptionDetails>
                            </DescriptionList>
                        </div>

                        <Divider />

                        {/* Daily Requests Bar Chart */}
                        <div>
                            <Subheading>Daily Requests</Subheading>
                            {data.internal.dailyRequests.length > 0 ? (
                                <div className="mt-4">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={data.internal.dailyRequests.map(d => ({
                                            date: formatDate(d.date),
                                            requests: Number(d.count),
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 12, fill: "#71717a" }}
                                                className="dark:[&_text]:fill-zinc-400"
                                            />
                                            <YAxis
                                                tick={{ fontSize: 12, fill: "#71717a" }}
                                                className="dark:[&_text]:fill-zinc-400"
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "white",
                                                    border: "1px solid #e4e4e7",
                                                    borderRadius: "0.5rem",
                                                    fontSize: "0.875rem",
                                                    fontFamily: "inherit"
                                                }}
                                                labelStyle={{
                                                    fontSize: "0.875rem",
                                                    fontFamily: "inherit",
                                                    fontWeight: 500,
                                                    display: "none"
                                                }}
                                                itemStyle={{
                                                    fontSize: "0.875rem",
                                                    fontFamily: "inherit"
                                                }}
                                                cursor={{ fill: "rgba(113, 113, 122, 0.15)" }}
                                            />
                                            <Bar dataKey="requests" fill="#3b82f6" name="Requests" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <Text className="mt-4 text-zinc-500">No request data for this period.</Text>
                            )}
                        </div>

                        <Divider />

                        {/* Top Endpoints */}
                        <div>
                            <Subheading>Top Endpoints</Subheading>
                            {data.internal.topEndpoints.length > 0 ? (
                                <div className="mt-4 overflow-x-auto">
                                    <Table striped dense>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeader>Endpoint</TableHeader>
                                                <TableHeader className="text-right">Requests</TableHeader>
                                                <TableHeader className="text-right">Avg Duration</TableHeader>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {data.internal.topEndpoints.map((ep) => (
                                                <TableRow key={ep.endpoint}>
                                                    <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                                                    <TableCell className="text-right">{formatNumber(ep.count)}</TableCell>
                                                    <TableCell className="text-right">{ep.avg_duration_ms}ms</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <Text className="mt-4 text-zinc-500">No endpoint data for this period.</Text>
                            )}
                        </div>

                        <Divider />

                        {/* Top Actions */}
                        <div>
                            <Subheading>Top Actions</Subheading>
                            {data.internal.topActions.length > 0 ? (
                                <div className="mt-4 overflow-x-auto">
                                    <Table striped dense>
                                        <TableHead>
                                            <TableRow>
                                                <TableHeader>Action</TableHeader>
                                                <TableHeader className="text-right">Count</TableHeader>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {data.internal.topActions.map((a) => (
                                                <TableRow key={a.action}>
                                                    <TableCell>
                                                        <Badge color="zinc">{a.action}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatNumber(a.count)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <Text className="mt-4 text-zinc-500">No action data for this period.</Text>
                            )}
                        </div>

                        <Divider />

                        {/* User Signups */}
                        {data.internal.userSignups.length > 0 && (
                            <>
                                <div>
                                    <Subheading>User Signups</Subheading>
                                    <div className="mt-4 overflow-x-auto">
                                        <Table striped dense>
                                            <TableHead>
                                                <TableRow>
                                                    <TableHeader>Date</TableHeader>
                                                    <TableHeader className="text-right">Signups</TableHeader>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {data.internal.userSignups.map((d) => (
                                                    <TableRow key={d.date}>
                                                        <TableCell>{formatDate(d.date)}</TableCell>
                                                        <TableCell className="text-right">{formatNumber(d.count)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                                <Divider />
                            </>
                        )}

                        {/* Search Console Section */}
                        <div>
                            <Heading level={2}>Google Search Console</Heading>
                            {data.searchConsole === null ? (
                                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
                                    <Subheading>Setup Required</Subheading>
                                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                                        To see Search Console data, configure these environment variables:
                                    </Text>
                                    <pre className="mt-3 rounded-lg bg-zinc-100 p-4 text-xs font-mono dark:bg-zinc-900">
{`GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://nobull.fit/`}
                                    </pre>
                                    <Text className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                                        1. Create a service account in Google Cloud Console and enable the Search Console API.
                                        2. Download the JSON key and copy the email and private_key values.
                                        3. Add the service account email as a user in Search Console settings.
                                    </Text>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-8">
                                    {/* Overall Performance */}
                                    <div>
                                        <Subheading>Overall Performance</Subheading>
                                        <DescriptionList className="mt-4">
                                            <DescriptionTerm>Total Clicks</DescriptionTerm>
                                            <DescriptionDetails>{formatNumber(data.searchConsole.overall.clicks)}</DescriptionDetails>

                                            <DescriptionTerm>Total Impressions</DescriptionTerm>
                                            <DescriptionDetails>{formatNumber(data.searchConsole.overall.impressions)}</DescriptionDetails>

                                            <DescriptionTerm>Average CTR</DescriptionTerm>
                                            <DescriptionDetails>{(data.searchConsole.overall.ctr * 100).toFixed(2)}%</DescriptionDetails>

                                            <DescriptionTerm>Average Position</DescriptionTerm>
                                            <DescriptionDetails>{data.searchConsole.overall.position.toFixed(1)}</DescriptionDetails>
                                        </DescriptionList>
                                    </div>

                                    {/* Top Queries */}
                                    {data.searchConsole.topQueries.length > 0 && (
                                        <div>
                                            <Subheading>Top Search Queries</Subheading>
                                            <div className="mt-4 overflow-x-auto">
                                                <Table striped dense>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableHeader>Query</TableHeader>
                                                            <TableHeader className="text-right">Clicks</TableHeader>
                                                            <TableHeader className="text-right hidden sm:table-cell">Impressions</TableHeader>
                                                            <TableHeader className="text-right hidden sm:table-cell">CTR</TableHeader>
                                                            <TableHeader className="text-right">Position</TableHeader>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {data.searchConsole.topQueries.map((q) => (
                                                            <TableRow key={q.query}>
                                                                <TableCell className="font-medium">{q.query}</TableCell>
                                                                <TableCell className="text-right">{formatNumber(q.clicks)}</TableCell>
                                                                <TableCell className="text-right hidden sm:table-cell">{formatNumber(q.impressions)}</TableCell>
                                                                <TableCell className="text-right hidden sm:table-cell">{(q.ctr * 100).toFixed(2)}%</TableCell>
                                                                <TableCell className="text-right">{q.position.toFixed(1)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Pages */}
                                    {data.searchConsole.topPages.length > 0 && (
                                        <div>
                                            <Subheading>Top Pages</Subheading>
                                            <div className="mt-4 overflow-x-auto">
                                                <Table striped dense>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableHeader>Page</TableHeader>
                                                            <TableHeader className="text-right">Clicks</TableHeader>
                                                            <TableHeader className="text-right hidden sm:table-cell">Impressions</TableHeader>
                                                            <TableHeader className="text-right hidden sm:table-cell">CTR</TableHeader>
                                                            <TableHeader className="text-right">Position</TableHeader>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {data.searchConsole.topPages.map((p) => (
                                                            <TableRow key={p.page}>
                                                                <TableCell className="font-mono text-xs">{shortenUrl(p.page)}</TableCell>
                                                                <TableCell className="text-right">{formatNumber(p.clicks)}</TableCell>
                                                                <TableCell className="text-right hidden sm:table-cell">{formatNumber(p.impressions)}</TableCell>
                                                                <TableCell className="text-right hidden sm:table-cell">{(p.ctr * 100).toFixed(2)}%</TableCell>
                                                                <TableCell className="text-right">{p.position.toFixed(1)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Device Breakdown */}
                                    {data.searchConsole.devices.length > 0 && (
                                        <div>
                                            <Subheading>Device Breakdown</Subheading>
                                            <DescriptionList className="mt-4">
                                                {data.searchConsole.devices.map((d) => (
                                                    <div key={d.device} className="contents">
                                                        <DescriptionTerm className="capitalize">{d.device.toLowerCase()}</DescriptionTerm>
                                                        <DescriptionDetails>
                                                            {formatNumber(d.clicks)} clicks / {formatNumber(d.impressions)} impressions
                                                        </DescriptionDetails>
                                                    </div>
                                                ))}
                                            </DescriptionList>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </SidebarLayout>
    );
};

export default AdminAnalytics;
