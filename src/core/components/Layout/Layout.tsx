import { Outlet, useLocation } from "react-router-dom";
import { Navbar, NavbarItem, NavbarSection, NavbarSpacer } from "@components/navbar";
import { Sidebar, SidebarBody, SidebarFooter, SidebarHeader, SidebarItem, SidebarLabel, SidebarSection } from "@components/sidebar";
import { StackedLayout } from "@components/stacked-layout";
import { Link } from "@components/link";
import { Button } from "@components/button";
import { useAuth } from "@core/contexts/AuthContext";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";

// Main layout component - provides navigation and renders child routes using Catalyst StackedLayout
const Layout: React.FC = () => {
    const location = useLocation();
    const { user, isLoading } = useAuth();

    return (
        <StackedLayout
            navbar={
                <Navbar>
                    <Link href="/" aria-label="Home" className="text-xl font-semibold text-zinc-950 dark:text-white">
                        NoBullFit
                    </Link>
                    <NavbarSection className="max-lg:hidden">
                        <NavbarItem href="/" current={location.pathname === "/"} className="rounded-none p-0">
                            Home
                        </NavbarItem>
                        <NavbarItem href="/about" current={location.pathname === "/about"} className="rounded-none p-0">
                            About
                        </NavbarItem>
                        <NavbarItem href="/contact" current={location.pathname === "/contact"} className="rounded-none p-0">
                            Contact
                        </NavbarItem>
                    </NavbarSection>
                    <NavbarSpacer />
                    <NavbarSection>
                        {!isLoading && user ? (
                            <Button href="/dashboard" className="max-lg:hidden">
                                Dashboard
                            </Button>
                        ) : !isLoading ? (
                            <>
                                <Button href="/sign-in" outline className="max-lg:hidden">
                                    Sign In
                                </Button>
                                <Button href="/sign-up" className="max-lg:hidden">
                                    Sign Up
                                </Button>
                            </>
                        ) : null}
                    </NavbarSection>
                </Navbar>
            }
            sidebar={
                <Sidebar>
                    <SidebarHeader>
                        <SidebarSection>
                            <SidebarItem href="/" current={location.pathname === "/"}>
                                <SidebarLabel>Home</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem href="/about" current={location.pathname === "/about"}>
                                <SidebarLabel>About</SidebarLabel>
                            </SidebarItem>
                            <SidebarItem href="/contact" current={location.pathname === "/contact"}>
                                <SidebarLabel>Contact</SidebarLabel>
                            </SidebarItem>
                        </SidebarSection>
                    </SidebarHeader>
                    <SidebarBody />
                    <SidebarFooter>
                        <SidebarSection>
                            {!isLoading && user ? (
                                <SidebarItem href="/dashboard">
                                    <SidebarLabel>Dashboard</SidebarLabel>
                                </SidebarItem>
                            ) : !isLoading ? (
                                <>
                                    <SidebarItem href="/sign-in">
                                        <SidebarLabel>Sign In</SidebarLabel>
                                    </SidebarItem>
                                    <SidebarItem href="/sign-up">
                                        <SidebarLabel>Sign Up</SidebarLabel>
                                    </SidebarItem>
                                </>
                            ) : null}
                        </SidebarSection>
                    </SidebarFooter>
                </Sidebar>
            }
        >
            <ScrollToTop />
            <Outlet />
            <Footer />
        </StackedLayout>
    );
};

export default Layout;