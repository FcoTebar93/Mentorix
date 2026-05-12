import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "./auth.api";
import type { AuthUser } from "./types";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "mentorix.auth.token";

type Props = {
  children: ReactNode;
};

export function AuthProvider({ children }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setLoading(false);
      return;
    }
    const storedToken = saved;

    let active = true;
    async function restore() {
      try {
        const me = await authApi.me(storedToken);
        if (!active) return;
        setToken(storedToken);
        setUser(me.user);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (active) setLoading(false);
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password });
    setToken(res.accessToken);
    setUser(res.user);
    localStorage.setItem(STORAGE_KEY, res.accessToken);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      isAuthenticated: !!token && !!user,
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}