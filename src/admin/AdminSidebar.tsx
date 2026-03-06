import { useLocation } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarHeader, SidebarItem, SidebarLabel, SidebarSection, SidebarHeading } from "@components/sidebar";

// Admin sidebar component
const AdminSidebar: React.FC = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <Sidebar>
            <SidebarHeader>
                <SidebarSection>
                    <SidebarHeading>Admin Panel</SidebarHeading>
                    <SidebarItem href="/admin" current={currentPath === "/admin"}>
                        <SidebarLabel>Overview</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/admin/users" current={currentPath === "/admin/users"}>
                        <SidebarLabel>Users</SidebarLabel>
                    </SidebarItem>
                    <SidebarItem href="/admin/emails" current={currentPath === "/admin/emails"}>
                        <SidebarLabel>Emails</SidebarLabel>
                    </SidebarItem>
                </SidebarSection>
            </SidebarHeader>
            <SidebarBody />
        </Sidebar>
    );
};

export default AdminSidebar;
