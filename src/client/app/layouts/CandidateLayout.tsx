import { Navigate, Outlet, useParams } from "react-router-dom";

export function CandidateLayout() {
  const { token } = useParams<{ token: string }>();

  if (!token) return <Navigate to="/" replace />;

  return (
    <section className="candidate-shell">
      <section className="candidate-layout">
        <aside className="candidate-sidebar">
          <div className="brand-block">
            <strong>Mentorix AI</strong>
            <span>Interview</span>
          </div>
          <nav className="candidate-nav">
            <button type="button" className="is-active">
              Interview
            </button>
            <button type="button">History</button>
            <button type="button">Settings</button>
          </nav>
          <p className="sidebar-muted">Preparado para entrevistas técnicas guiadas por IA.</p>
        </aside>
        <section className="candidate-card">
          <Outlet />
        </section>
      </section>
    </section>
  );
}
