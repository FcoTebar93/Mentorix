import { useCallback } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { StartInterviewForm } from "./components/StartInterviewForm";
import { TurnPanel } from "./components/interview/TurnPanel";
import { ReportView } from "./components/ReportView";
import { SessionsPage } from "./components/interview/SessionsPage";
import { SessionLoader } from "./components/interview/SessionLoader";
import { AuthGuard } from "./modules/auth/AuthGuard";
import { useAuth } from "./modules/auth/AuthContext";
import { TemplateListPage } from "./modules/templates/TemplateListPage";
import { TemplateNewPage } from "./modules/templates/TemplateNewPage";
import { TemplateEditPage } from "./modules/templates/TemplateEditPage";
import { TemplateLinksPage } from "./modules/templates/TemplateLinksPage";
import { TemplateResultsPage } from "./modules/templates/TemplateResultsPage";
import { LandingPage } from "./modules/landing/LandingPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />

        <Route path="/interview/:token" element={<CandidateLayout />}>
          <Route index element={<CandidateStartRoute />} />
          <Route path="session/:sessionId" element={<CandidateSessionRoute />} />
          <Route path="report/:sessionId" element={<CandidateReportRoute />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Navigate to="/admin/templates" replace />} />
          <Route path="/admin/templates" element={<TemplateListPage />} />
          <Route path="/admin/templates/new" element={<TemplateNewPage />} />
          <Route path="/admin/templates/:templateId/edit" element={<TemplateEditPage />} />
          <Route path="/admin/templates/:templateId/links" element={<TemplateLinksRoute />} />
          <Route path="/admin/templates/:templateId/results" element={<TemplateResultsPage />} />
          <Route path="/admin/sessions" element={<SessionsPage />} />
          <Route path="/admin/sessions/:sessionId" element={<SessionRunRoute />} />
          <Route path="/admin/sessions/:sessionId/report" element={<SessionReportRoute />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LandingRoute() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onLogin={() => navigate("/admin")}
      onCreate={() => navigate("/admin")}
      onCandidateAccess={() => promptCandidateLink(navigate)}
    />
  );
}

function promptCandidateLink(navigate: (path: string) => void): void {
  if (typeof window === "undefined") return;
  const input = window.prompt(
    "Pega aquí tu link de entrevista o el token compartido por el reclutador:"
  );
  if (!input) return;
  const trimmed = input.trim();
  if (!trimmed) return;

  try {
    const asUrl = new URL(trimmed);
    navigate(asUrl.pathname + asUrl.search);
    return;
  } catch {
    // no es URL absoluta: lo tratamos como token suelto
  }

  const token = trimmed.replace(/^\/+/, "").replace(/^interview\//, "");
  navigate(`/interview/${encodeURIComponent(token)}`);
}

function CandidateLayout() {
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
            <button type="button" className="is-active">Interview</button>
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

function CandidateStartRoute() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  return (
    <StartInterviewForm
      presetToken={token ?? ""}
      showTokenField={false}
      onStarted={(sessionId, firstQuestionId, firstQuestionText) =>
        navigate(`session/${encodeURIComponent(sessionId)}`, {
          state: { questionId: firstQuestionId, questionText: firstQuestionText },
        })
      }
    />
  );
}

function CandidateSessionRoute() {
  const { token, sessionId } = useParams<{ token: string; sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  if (!sessionId) return <Navigate to={`/interview/${encodeURIComponent(token ?? "")}`} replace />;

  const handleBack = () => navigate(`/interview/${encodeURIComponent(token ?? "")}`);
  const handleCompleted = () =>
    navigate(`/interview/${encodeURIComponent(token ?? "")}/report/${encodeURIComponent(sessionId)}`, {
      state: { celebrate: true },
    });

  const initialQuestionId = (location.state as { questionId?: string } | null)?.questionId;
  const initialQuestionText = (location.state as { questionText?: string } | null)?.questionText;

  if (initialQuestionId) {
    return (
      <TurnPanel
        sessionId={sessionId}
        initialQuestionId={initialQuestionId}
        initialQuestionText={initialQuestionText}
        onCompleted={handleCompleted}
      />
    );
  }

  return <SessionLoader sessionId={sessionId} onBack={handleBack} onCompleted={handleCompleted} />;
}

function CandidateReportRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();

  if (!sessionId) return <Navigate to="/" replace />;

  const celebrate = (location.state as { celebrate?: boolean } | null)?.celebrate ?? true;
  return <ReportView sessionId={sessionId} celebrate={celebrate} />;
}

function AdminLayout() {
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

function TemplateLinksRoute() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  if (!templateId) return <Navigate to="/admin/templates" replace />;

  return (
    <TemplateLinksPage
      templateId={templateId}
      onBack={() => navigate("/admin/templates")}
    />
  );
}

function SessionRunRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  if (!sessionId) return <Navigate to="/admin/sessions" replace />;

  const initialQuestionId = (location.state as { questionId?: string } | null)?.questionId;
  const initialQuestionText = (location.state as { questionText?: string } | null)?.questionText;

  const handleBack = () => navigate("/admin/sessions");
  const handleCompleted = () =>
    navigate(`/admin/sessions/${encodeURIComponent(sessionId)}/report`, {
      state: { celebrate: true },
    });

  return (
    <section className="stack-md">
      <button type="button" className="btn-ghost" onClick={handleBack}>
        Volver
      </button>
      {initialQuestionId ? (
        <TurnPanel
          sessionId={sessionId}
          initialQuestionId={initialQuestionId}
          initialQuestionText={initialQuestionText}
          onCompleted={handleCompleted}
        />
      ) : (
        <SessionLoader sessionId={sessionId} onBack={handleBack} onCompleted={handleCompleted} />
      )}
    </section>
  );
}

function SessionReportRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  if (!sessionId) return <Navigate to="/admin/sessions" replace />;

  const celebrate = (location.state as { celebrate?: boolean } | null)?.celebrate;

  return (
    <section className="stack-md">
      <button type="button" className="btn-ghost" onClick={() => navigate("/admin/sessions")}>
        Volver a sesiones
      </button>
      <ReportView sessionId={sessionId} celebrate={celebrate} />
    </section>
  );
}
