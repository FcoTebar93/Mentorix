import { useAuth } from "./AuthContext";
import { LoginPage } from "./LoginPage";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onLoginSuccess?: () => void;
};

export function AuthGuard({ children, onLoginSuccess }: Props) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <p>Cargando sesión...</p>;

  if (!isAuthenticated) {
    return <LoginPage onSuccess={onLoginSuccess ?? (() => undefined)} />;
  }

  return <>{children}</>;
}