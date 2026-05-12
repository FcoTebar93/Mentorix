import { useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthGuard } from "../../features/auth/AuthGuard";
import { useAuth } from "../../features/auth/AuthContext";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = useCallback(() => {
    logout();
    navigate("/", { replace: true });
  }, [logout, navigate]);

  const isTemplates = location.pathname.startsWith("/admin/templates");
  const isSessions = location.pathname.startsWith("/admin/sessions");

  return (
    <AuthGuard>
      <section className="app-shell">
        <header className="app-header">
          <div className="brand-block">
            <strong>Mentorix Admin</strong>
            <span>{user?.email ?? "sin usuario"}</span>
          </div>
          <nav className="admin-nav">
            <button
              type="button"
              className={isTemplates ? "is-active" : ""}
              onClick={() => navigate("/admin/templates")}
            >
              Entrevistas
            </button>
            <button
              type="button"
              className={isSessions ? "is-active" : ""}
              onClick={() => navigate("/admin/sessions")}
            >
              Sesiones
            </button>
          </nav>
          <button type="button" className="btn-ghost" onClick={handleLogout}>
            Salir
          </button>
        </header>
        <section className="page-content">
          <Outlet />
        </section>
      </section>
    </AuthGuard>
  );
}
