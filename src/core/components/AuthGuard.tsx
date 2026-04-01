import { Outlet } from "react-router-dom";

// Prevents authenticated pages from rendering when no auth token exists
// Catches back-button navigation after logout before any dashboard content is shown
const AuthGuard: React.FC = () => {
    if (typeof window === "undefined") return <Outlet />;

    const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (!token) {
        window.location.replace("/sign-in");
        return null;
    }

    return <Outlet />;
};

export default AuthGuard;
