import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarFooter, SidebarHeader, SidebarItem, SidebarLabel, SidebarSection, SidebarHeading } from "@components/sidebar";
import { Avatar } from "@components/avatar";
import { Dropdown, DropdownButton, DropdownDivider, DropdownItem, DropdownLabel, DropdownMenu } from "@components/dropdown";
import { NavbarItem } from "@components/navbar";
import { useAuth } from "@core/contexts/AuthContext";
import { CollapsibleSidebarSection } from "@components/collapsible-sidebar-section";
import { Settings, ShieldCheck, Lightbulb, LogOut, ChevronUp, CreditCard } from "lucide-react";
import { Skeleton } from "@components/skeleton";

// Get user initials for avatar
const getUserInitials = (user: { full_name?: string } | null) => {
    if (!user?.full_name) return "U";
    const names = user.full_name.split(" ");
    if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.full_name[0].toUpperCase();
};

// User dropdown component for navbar
export function UserDropdown() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleLogout = () => {
        // Clear tokens first (but don't update user state yet to prevent flicker)
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            sessionStorage.removeItem("auth_token");
            // Call logout API
            fetch("/api/auth/logout", { method: "POST" }).catch(console.error);
        }
        // Redirect immediately using full page reload to prevent any re-render with null user
        window.location.href = "/";
    };

    return (
        <Dropdown>
            <DropdownButton as={NavbarItem}>
                <Avatar initials={getUserInitials(user)} />
            </DropdownButton>
            <DropdownMenu className="min-w-64" anchor="bottom end">
                <DropdownItem onClick={() => navigate("/dashboard/settings")}>
                    <Settings className="size-4" data-slot="icon" />
                    <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/dashboard/billing")}>
                    <CreditCard className="size-4" data-slot="icon" />
                    <DropdownLabel>Billing</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/privacy-policy">
                    <ShieldCheck className="size-4" data-slot="icon" />
                    <DropdownLabel>Privacy policy</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/contact">
                    <Lightbulb className="size-4" data-slot="icon" />
                    <DropdownLabel>Share feedback</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={handleLogout}>
                    <LogOut className="size-4" data-slot="icon" />
                    <DropdownLabel>Sign out</DropdownLabel>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}

// Sidebar footer dropdown component
export function SidebarFooterDropdown() {
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();

    const handleLogout = () => {
        // Clear tokens first (but don't update user state yet to prevent flicker)
        if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
            sessionStorage.removeItem("auth_token");
            // Call logout API
            fetch("/api/auth/logout", { method: "POST" }).catch(console.error);
        }
        // Redirect immediately using full page reload to prevent any re-render with null user
        window.location.href = "/";
    };

    return (
        <Dropdown>
            <DropdownButton as={SidebarItem}>
                <span className="flex min-w-0 items-center gap-3">
                    {isLoading ? (
                        <Skeleton variant="rectangular" className="size-10 rounded-md" />
                    ) : (
                        <Avatar initials={getUserInitials(user)} className="size-10" square alt="" />
                    )}
                    <span className="min-w-0">
                        {isLoading ? (
                            <>
                                <Skeleton variant="text" className="h-4 w-24 mb-1" />
                                <Skeleton variant="text" className="h-3 w-32" />
                            </>
                        ) : (
                            <>
                                <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
                                    {user?.full_name || "User"}
                                </span>
                                <span className="block truncate text-xs/5 font-normal text-zinc-500 dark:text-zinc-400">
                                    {user?.email || ""}
                                </span>
                            </>
                        )}
                    </span>
                </span>
                <ChevronUp className="size-4" />
            </DropdownButton>
            <DropdownMenu className="min-w-64" anchor="top start">
                <DropdownItem onClick={() => navigate("/dashboard/settings")}>
                    <Settings className="size-4" data-slot="icon" />
                    <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>
                <DropdownItem onClick={() => navigate("/dashboard/billing")}>
                    <CreditCard className="size-4" data-slot="icon" />
                    <DropdownLabel>Billing</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem href="/privacy-policy">
                    <ShieldCheck className="size-4" data-slot="icon" />
                    <DropdownLabel>Privacy policy</DropdownLabel>
                </DropdownItem>
                <DropdownItem href="/contact">
                    <Lightbulb className="size-4" data-slot="icon" />
                    <DropdownLabel>Share feedback</DropdownLabel>
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={handleLogout}>
                    <LogOut className="size-4" data-slot="icon" />
                    <DropdownLabel>Sign out</DropdownLabel>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
}

// Main sidebar component
interface DashboardSidebarProps {
    currentPath?: string;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ currentPath: propCurrentPath }) => {
    const location = useLocation();
    // Use prop if provided, otherwise use location.pathname for dynamic updates
    const currentPath = propCurrentPath ?? location.pathname;

    // Determine which section should be expanded based on current path
    const foodNutritionPaths = ["/dashboard/food-database", "/dashboard/recipe-database"];
    const progressAnalyticsPaths = ["/dashboard/progress-tracking", "/dashboard/food-tracking", "/dashboard/tdee"];
    const healthFitnessPaths = ["/dashboard/integrations"];

    const isFoodNutritionOpen = foodNutritionPaths.includes(currentPath);
    const isProgressAnalyticsOpen = progressAnalyticsPaths.includes(currentPath);
    const isHealthFitnessOpen = healthFitnessPaths.includes(currentPath);

    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarSection>
                    <SidebarHeading>Dashboard</SidebarHeading>
                    <SidebarItem href="/dashboard" current={currentPath === "/dashboard"}>
                        <SidebarLabel>Overview</SidebarLabel>
                    </SidebarItem>
                </SidebarSection>
            </SidebarHeader>
            <SidebarBody className="[&>[data-slot=section]+[data-slot=section]]:!mt-0">
                <CollapsibleSidebarSection title="Food & Nutrition" defaultOpen={isFoodNutritionOpen} className="mb-2">
                    <SidebarItem href="/dashboard/food-database" current={currentPath === "/dashboard/food-database"}>
                        <SidebarLabel>Food Database</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/dashboard/recipe-database" current={currentPath === "/dashboard/recipe-database"}>
                        <SidebarLabel>Recipe Database</SidebarLabel>
                    </SidebarItem>
                </CollapsibleSidebarSection>
                <CollapsibleSidebarSection title="Health & Fitness Apps" defaultOpen={isHealthFitnessOpen} className="mb-2">
                    <SidebarItem href="/dashboard/integrations" current={currentPath === "/dashboard/integrations"}>
                        <SidebarLabel>Integrations</SidebarLabel>
                    </SidebarItem>
                </CollapsibleSidebarSection>
                <CollapsibleSidebarSection title="Progress & Analytics" defaultOpen={isProgressAnalyticsOpen} className="mb-2">
                    <SidebarItem href="/dashboard/progress-tracking" current={currentPath === "/dashboard/progress-tracking"}>
                        <SidebarLabel>Progress Tracking</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/dashboard/food-tracking" current={currentPath === "/dashboard/food-tracking"}>
                        <SidebarLabel>Food Tracking</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/dashboard/tdee" current={currentPath === "/dashboard/tdee"}>
                        <SidebarLabel>TDEE Calculator</SidebarLabel>
                    </SidebarItem>
                </CollapsibleSidebarSection>
                <div className="mt-2">
                    <SidebarItem href="/dashboard/grocery-lists" current={currentPath === "/dashboard/grocery-lists"}>
                        <SidebarLabel>Grocery Lists</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/dashboard/favorites" current={currentPath === "/dashboard/favorites"}>
                        <SidebarLabel>Favorites</SidebarLabel>
                    </SidebarItem>
                </div>
            </SidebarBody>
            <SidebarFooter className="max-lg:hidden">
                <SidebarFooterDropdown />
            </SidebarFooter>
        </Sidebar>
    );
};

export default DashboardSidebar;
