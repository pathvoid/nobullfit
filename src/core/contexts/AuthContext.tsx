import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
    id: number;
    email: string;
    full_name: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (user: User, token: string, remember?: boolean) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Initialize state synchronously - check for token immediately
    // This prevents flicker by knowing auth state before first render
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(() => {
        // Check for token synchronously during initialization
        if (typeof window === "undefined") {
            return false;
        }
        const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
        // If no token, we know user is not logged in immediately
        // If token exists, we need to verify it, so keep loading true
        return !!token;
    });

    // Check authentication status on mount (only if we have a token to verify)
    useEffect(() => {
        // Only check auth if we detected a token during initialization
        if (isLoading) {
            checkAuth();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuth = async () => {
        try {
            // Guard localStorage/sessionStorage access for SSR
            if (typeof window === "undefined") {
                setIsLoading(false);
                return;
            }

            // Check both localStorage (remember me) and sessionStorage (session only)
            const token = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
            if (!token) {
                setIsLoading(false);
                return;
            }

            // Verify token with server
            const response = await fetch("/api/auth/me", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                if (userData.user) {
                    setUser(userData.user);
                } else {
                    // Invalid response format
                    console.error("Auth check: Invalid response format", userData);
                    // Clear both storage locations
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setUser(null);
                }
            } else {
                // Token invalid or expired
                const errorData = await response.json().catch(() => ({}));
                console.error("Auth check failed:", response.status, errorData.error || "Unknown error");
                // Only clear token if it's actually invalid (401), not server errors
                if (response.status === 401) {
                    // Clear both storage locations
                    localStorage.removeItem("auth_token");
                    sessionStorage.removeItem("auth_token");
                    setUser(null);
                }
            }
        } catch (error) {
            console.error("Auth check error:", error);
            // Don't clear token on network errors - might be temporary
            // The token will be checked again on next page load
        } finally {
            setIsLoading(false);
        }
    };

    const login = (userData: User, token: string, remember: boolean = false) => {
        // Guard localStorage/sessionStorage access for SSR
        if (typeof window !== "undefined") {
            if (remember) {
                // Save to localStorage for persistence across browser restarts
                localStorage.setItem("auth_token", token);
                // Clear sessionStorage to avoid conflicts
                sessionStorage.removeItem("auth_token");
            } else {
                // Save to sessionStorage for session-only persistence
                sessionStorage.setItem("auth_token", token);
                // Clear localStorage to avoid conflicts
                localStorage.removeItem("auth_token");
            }
        }
        // Update user state immediately (works in both SSR and client)
        setUser(userData);
    };

    const logout = () => {
        // Clear user state first (before clearing storage) to prevent UI flicker
        setUser(null);
        // Guard localStorage/sessionStorage access for SSR
        if (typeof window !== "undefined") {
            // Clear both storage locations
            localStorage.removeItem("auth_token");
            sessionStorage.removeItem("auth_token");
            // Optionally call logout API endpoint
            fetch("/api/auth/logout", { method: "POST" }).catch(console.error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
