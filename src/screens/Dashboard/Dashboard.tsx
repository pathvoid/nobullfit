import useHelmet from "@hooks/useHelmet";
import { useLoaderData, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { SidebarLayout } from "@components/sidebar-layout";
import { Navbar, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Logo } from "@components/logo";
import { Heading } from "@components/heading";
import { Text } from "@components/text";
import { Button } from "@components/button";
import { Select } from "@components/select";
import { useAuth } from "@core/contexts/AuthContext";
import DashboardSidebar, { UserDropdown } from "./DashboardSidebar";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import { TrendingUp, TrendingDown, Activity, UtensilsCrossed, Flame } from "lucide-react";

interface DashboardStats {
    today: {
        calories_consumed: number;
        calories_burned: number;
        protein: number;
        carbs: number;
        fat: number;
        food_count: number;
        activity_count: number;
    };
    averages: {
        calories_consumed: number;
        calories_burned: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    dailyStats: Array<{
        date: string;
        calories_consumed: number;
        calories_burned: number;
        protein: number;
        carbs: number;
        fat: number;
    }>;
    activityTypes: Array<{
        type: string;
        count: number;
        total_calories: number;
    }>;
    categories: Array<{
        category: string;
        count: number;
        total_calories: number;
    }>;
    weightData: Array<{
        date: string;
        weight: number;
        unit: string;
    }>;
    weightUnit: string | null;
    tdee: {
        age: number;
        gender: string;
        height_cm: number;
        activity_level: string;
        bmr: number;
        tdee: number;
        created_at: string;
        updated_at: string;
    } | null;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const Dashboard: React.FC = () => {
    const loaderData = useLoaderData() as {
        title: string;
        meta: unknown[];
        user?: unknown;
        stats?: DashboardStats | null;
    };
    const navigate = useNavigate();
    const helmet = useHelmet();
    const { user, isLoading } = useAuth();

    const [stats, setStats] = useState<DashboardStats | null>(loaderData.stats || null);
    const [period, setPeriod] = useState<"week" | "month" | "all">("week");
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Client-side protection: redirect if not authenticated (fallback for client-side navigation)
    useEffect(() => {
        if (!isLoading && !user) {
            navigate("/sign-in?redirect=/dashboard");
        }
    }, [user, isLoading, navigate]);

    // Fetch stats when period changes
    const fetchStats = useCallback(async (periodValue: "week" | "month" | "all") => {
        setIsLoadingStats(true);
        try {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const response = await fetch(`/api/dashboard/stats?period=${periodValue}&timezone=${encodeURIComponent(userTimezone)}`, {
                credentials: "include"
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        fetchStats(period);
    }, [period, fetchStats]);

    // Set helmet values
    helmet.setTitle(loaderData.title);
    helmet.setMeta(loaderData.meta as Parameters<typeof helmet.setMeta>[0]);

    // Format date for display
    const formatChartDate = (dateStr: string) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    // Calculate net calories
    const netCalories = stats ? stats.today.calories_consumed - stats.today.calories_burned : 0;

    // Check if there's any data (today or historical)
    const hasData = stats && (
        stats.today.food_count > 0 ||
        stats.today.activity_count > 0 ||
        stats.today.calories_consumed > 0 ||
        stats.today.calories_burned > 0 ||
        (stats.dailyStats && stats.dailyStats.length > 0) ||
        (stats.activityTypes && stats.activityTypes.length > 0) ||
        (stats.categories && stats.categories.length > 0) ||
        (stats.weightData && stats.weightData.length > 0)
    );

    return (
        <SidebarLayout
            navbar={
                <Navbar>
                    <Logo className="h-6 text-zinc-950 dark:text-white forced-colors:text-[CanvasText]" />
                    <NavbarSpacer />
                    <NavbarSection>
                        <UserDropdown />
                    </NavbarSection>
                </Navbar>
            }
            sidebar={<DashboardSidebar currentPath="/dashboard" />}
        >
            <style>{`
                .recharts-pie-label-text {
                    font-size: 0.75rem !important;
                    font-family: inherit !important;
                    fill: #71717a !important;
                }
                .dark .recharts-pie-label-text {
                    fill: #a1a1aa !important;
                }
                .recharts-legend-item-text {
                    font-size: 0.875rem !important;
                    font-family: inherit !important;
                }
            `}</style>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                <div>
                    <Heading level={1}>Dashboard</Heading>
                    <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                        Welcome back, {user?.full_name || "User"}!
                    </Text>
                    </div>
                    {hasData && (
                        <div className="w-auto min-w-[140px]">
                            <Select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as "week" | "month" | "all")}
                            >
                                <option value="week">Last 7 Days</option>
                                <option value="month">Last 30 Days</option>
                                <option value="all">All Time</option>
                            </Select>
                        </div>
                    )}
                </div>

                {stats?.tdee && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <Heading level={2} className="mb-2 text-lg font-semibold">
                                    Your TDEE
                                </Heading>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">BMR (Basal Metabolic Rate)</Text>
                                        <Text className="text-xl font-bold">{Math.round(stats.tdee.bmr)} calories/day</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">TDEE (Total Daily Energy Expenditure)</Text>
                                        <Text className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {Math.round(stats.tdee.tdee)} calories/day
                                        </Text>
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                outline
                                onClick={() => navigate("/dashboard/tdee")}
                                className="ml-4 shrink-0"
                            >
                                View Details
                            </Button>
                        </div>
                    </div>
                )}

                {isLoadingStats ? (
                    <div className="flex items-center justify-center py-12">
                        <Text className="text-zinc-600 dark:text-zinc-400">Loading stats...</Text>
                    </div>
                ) : !hasData ? (
                    // Empty state - encourage user to start tracking
                    <div className="rounded-lg border border-zinc-950/10 bg-zinc-50 p-12 text-center dark:border-white/10 dark:bg-zinc-800/50">
                        <img 
                            src="https://cdn.nobull.fit/orange-waiting.png" 
                            alt="Start tracking" 
                            className="mx-auto h-48 w-48 object-contain"
                        />
                        <Heading level={2} className="mt-4">
                            Start Tracking Your Progress
                        </Heading>
                        <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
                            Track your food intake and activities to see detailed insights and progress over time.
                        </Text>
                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                            <Button onClick={() => navigate("/dashboard/food-tracking")}>
                                <UtensilsCrossed className="h-4 w-4 mr-2" data-slot="icon" />
                                Log Food
                            </Button>
                            <Button onClick={() => navigate("/dashboard/progress-tracking")} outline>
                                <Activity className="h-4 w-4 mr-2" data-slot="icon" />
                                Log Activity
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Today's Stats Cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Calories Consumed</Text>
                                        <Text className="mt-1 text-2xl font-semibold">{Math.round(stats!.today.calories_consumed)}</Text>
                                    </div>
                                    <UtensilsCrossed className="h-8 w-8 text-blue-500" />
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Calories Burned</Text>
                                        <Text className="mt-1 text-2xl font-semibold">{Math.round(stats!.today.calories_burned)}</Text>
                                    </div>
                                    <Flame className="h-8 w-8 text-orange-500" />
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Net Calories</Text>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Text className={`text-2xl font-semibold ${netCalories >= 0 ? "text-zinc-900 dark:text-zinc-100" : "text-green-600 dark:text-green-400"}`}>
                                                {netCalories >= 0 ? "+" : ""}{Math.round(netCalories)}
                        </Text>
                                            {netCalories < 0 ? (
                                                <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <TrendingUp className="h-5 w-5 text-zinc-400" />
                                            )}
                                        </div>
                                    </div>
                                    <Flame className="h-8 w-8 text-purple-500" />
                                </div>
                            </div>

                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Activities</Text>
                                        <Text className="mt-1 text-2xl font-semibold">{stats!.today.activity_count}</Text>
                                    </div>
                                    <Activity className="h-8 w-8 text-green-500" />
                                </div>
                            </div>
                        </div>

                        {/* Macros Card */}
                        {stats!.today.protein > 0 || stats!.today.carbs > 0 || stats!.today.fat > 0 ? (
                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <Heading level={2} className="mb-4 text-lg">
                                    Today's Macros
                                </Heading>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Protein</Text>
                                        <Text className="text-xl font-semibold">{Math.round(stats!.today.protein)}g</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Carbs</Text>
                                        <Text className="text-xl font-semibold">{Math.round(stats!.today.carbs)}g</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Fat</Text>
                                        <Text className="text-xl font-semibold">{Math.round(stats!.today.fat)}g</Text>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* Charts */}
                        {stats!.dailyStats.length > 0 && (() => {
                            const hasMacrosData = stats!.dailyStats.some(day => day.protein > 0 || day.carbs > 0 || day.fat > 0);
                            const chartItems = [
                                <div key="calories" className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                    <Heading level={2} className="mb-4 text-lg">
                                        Calories: Consumed vs Burned
                                    </Heading>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={stats!.dailyStats.map(day => ({
                                            ...day,
                                            date: formatChartDate(day.date)
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
                                                    fontWeight: 500
                                                }}
                                                itemStyle={{
                                                    fontSize: "0.875rem",
                                                    fontFamily: "inherit"
                                                }}
                                            />
                                            <Legend 
                                                wrapperStyle={{ fontSize: "0.875rem", fontFamily: "inherit" }}
                                                iconSize={12}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="calories_consumed"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                name="Consumed"
                                                dot={{ r: 4 }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="calories_burned"
                                                stroke="#f59e0b"
                                                strokeWidth={2}
                                                name="Burned"
                                                dot={{ r: 4 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ];
                            
                            if (hasMacrosData) {
                                chartItems.push(
                                    <div key="macros" className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                        <Heading level={2} className="mb-4 text-lg">
                                            Daily Macros
                                        </Heading>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats!.dailyStats.map(day => ({
                                                ...day,
                                                date: formatChartDate(day.date)
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
                                                        fontWeight: 500
                                                    }}
                                                    itemStyle={{
                                                        fontSize: "0.875rem",
                                                        fontFamily: "inherit"
                                                    }}
                                                />
                                                <Legend 
                                                    wrapperStyle={{ fontSize: "0.875rem", fontFamily: "inherit" }}
                                                    iconSize={12}
                                                />
                                                <Bar dataKey="protein" stackId="a" fill="#3b82f6" name="Protein (g)" />
                                                <Bar dataKey="carbs" stackId="a" fill="#10b981" name="Carbs (g)" />
                                                <Bar dataKey="fat" stackId="a" fill="#f59e0b" name="Fat (g)" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            }
                            
                            return (
                                <div 
                                    className={`grid grid-cols-1 gap-6 ${chartItems.length === 1 ? "lg:max-w-[50%]" : "lg:grid-cols-2"}`}
                                >
                                    {chartItems}
                                </div>
                            );
                        })()}

                        {/* Activity Types and Categories */}
                        {(stats!.activityTypes.length > 0 || stats!.categories.length > 0) && (() => {
                            const pieChartItems = [];
                            
                            if (stats!.activityTypes.length > 0) {
                                pieChartItems.push(
                                    <div key="activity-types" className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                        <Heading level={2} className="mb-4 text-lg">
                                            Activity Types
                                        </Heading>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={stats!.activityTypes}
                                                    dataKey="count"
                                                    nameKey="type"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    label={(props: { payload?: { type: string; count: number } }) => {
                                                        const data = props.payload || { type: "", count: 0 };
                                                        return `${data.type}: ${data.count}`;
                                                    }}
                                                >
                                                    {stats!.activityTypes.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
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
                                                        fontWeight: 500
                                                    }}
                                                    itemStyle={{
                                                        fontSize: "0.875rem",
                                                        fontFamily: "inherit"
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            }
                            
                            if (stats!.categories.length > 0) {
                                pieChartItems.push(
                                    <div key="food-categories" className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                        <Heading level={2} className="mb-4 text-lg">
                                            Food Categories
                                        </Heading>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <Pie
                                                    data={stats!.categories}
                                                    dataKey="count"
                                                    nameKey="category"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    label={(props: { payload?: { category: string; count: number } }) => {
                                                        const data = props.payload || { category: "", count: 0 };
                                                        return `${data.category}: ${data.count}`;
                                                    }}
                                                >
                                                    {stats!.categories.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
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
                                                        fontWeight: 500
                                                    }}
                                                    itemStyle={{
                                                        fontSize: "0.875rem",
                                                        fontFamily: "inherit"
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            }
                            
                            return (
                                <div 
                                    className={`grid grid-cols-1 gap-6 ${pieChartItems.length === 1 ? "lg:max-w-[50%]" : "lg:grid-cols-2"}`}
                                >
                                    {pieChartItems}
                                </div>
                            );
                        })()}

                        {/* Weight Chart */}
                        {stats!.weightData && stats!.weightData.length > 0 && (
                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <Heading level={2} className="mb-4 text-lg">
                                    Weight Trend ({stats!.weightUnit})
                                </Heading>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={stats!.weightData.map(entry => ({
                                        ...entry,
                                        date: formatChartDate(entry.date)
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
                                            label={{ value: `Weight (${stats!.weightUnit})`, angle: -90, position: "insideLeft", style: { fontSize: "0.875rem", fontFamily: "inherit" } }}
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
                                                fontWeight: 500
                                            }}
                                            itemStyle={{
                                                fontSize: "0.875rem",
                                                fontFamily: "inherit"
                                            }}
                                            formatter={(value: number | undefined) => [`${value ?? 0} ${stats!.weightUnit}`, "Weight"]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="weight"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            name="Weight"
                                            dot={{ r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Weekly Averages */}
                        {stats!.dailyStats.length > 0 && (
                            <div className="rounded-lg border border-zinc-950/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-800/50">
                                <Heading level={2} className="mb-4 text-lg">
                                    Average Daily Values ({period === "week" ? "Last 7 Days" : period === "month" ? "Last 30 Days" : "All Time"})
                                </Heading>
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Avg. Calories</Text>
                                        <Text className="text-lg font-semibold">{stats!.averages.calories_consumed}</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Avg. Burned</Text>
                                        <Text className="text-lg font-semibold">{stats!.averages.calories_burned}</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Avg. Protein</Text>
                                        <Text className="text-lg font-semibold">{stats!.averages.protein}g</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Avg. Carbs</Text>
                                        <Text className="text-lg font-semibold">{stats!.averages.carbs}g</Text>
                                    </div>
                                    <div>
                                        <Text className="text-sm text-zinc-600 dark:text-zinc-400">Avg. Fat</Text>
                                        <Text className="text-lg font-semibold">{stats!.averages.fat}g</Text>
                                    </div>
                                </div>
                </div>
                        )}
                    </>
                )}
            </div>
        </SidebarLayout>
    );
};

export default Dashboard;
