import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getToken, saveToken, removeToken } from '@/services/tokenStorage';
import { getMe, logout as apiLogout } from '@/services/api';
import type { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await getMe();
      if (response.user) {
        setUser(response.user);
      } else {
        await removeToken();
        setUser(null);
      }
    } catch {
      // Token invalid or network error
      try { await removeToken(); } catch { /* ignore storage errors */ }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (userData: User, token: string, remember: boolean) => {
    await saveToken(token, remember);
    setUser(userData);
  };

  const logout = async () => {
    setUser(null);
    await apiLogout();
    await removeToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
