import { lazy } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  parseInterviewSessionState,
  parseReportNavigationState,
} from "./navigation-state";
import { promptCandidateLink } from "./candidate-link";
import { AdminLayout } from "../layouts/AdminLayout";
import { CandidateLayout } from "../layouts/CandidateLayout";

const TemplateLinksPage = lazy(() =>
  import("../../features/templates/TemplateLinksPage").then((m) => ({ default: m.TemplateLinksPage }))
);
const LandingPage = lazy(() =>
  import("../../features/landing/LandingPage").then((m) => ({ default: m.LandingPage }))
);
const TemplateListPage = lazy(() =>
  import("../../features/templates/TemplateListPage").then((m) => ({ default: m.TemplateListPage }))
);
const TemplateNewPage = lazy(() =>
  import("../../features/templates/TemplateNewPage").then((m) => ({ default: m.TemplateNewPage }))
);
const TemplateEditPage = lazy(() =>
  import("../../features/templates/TemplateEditPage").then((m) => ({ default: m.TemplateEditPage }))
);
const TemplateResultsPage = lazy(() =>
  import("../../features/templates/TemplateResultsPage").then((m) => ({ default: m.TemplateResultsPage }))
);
const SessionsPage = lazy(() =>
  import("../../features/interview/SessionsPage").then((m) => ({ default: m.SessionsPage }))
);
const StartInterviewForm = lazy(() =>
  import("../../features/interview/StartInterviewForm").then((m) => ({ default: m.StartInterviewForm }))
);
const TurnPanel = lazy(() =>
  import("../../features/interview/TurnPanel").then((m) => ({ default: m.TurnPanel }))
);
const SessionLoader = lazy(() =>
  import("../../features/interview/SessionLoader").then((m) => ({ default: m.SessionLoader }))
);
const ReportView = lazy(() =>
  import("../../features/interview/ReportView").then((m) => ({ default: m.ReportView }))
);

export function AppRoutes() {
  return (
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

  const { questionId: initialQuestionId, questionText: initialQuestionText } = parseInterviewSessionState(
    location.state
  );

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

  const { celebrate } = parseReportNavigationState(location.state);
  return <ReportView sessionId={sessionId} celebrate={celebrate ?? true} />;
}

function TemplateLinksRoute() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  if (!templateId) return <Navigate to="/admin/templates" replace />;

  return (
    <TemplateLinksPage templateId={templateId} onBack={() => navigate("/admin/templates")} />
  );
}

function SessionRunRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  if (!sessionId) return <Navigate to="/admin/sessions" replace />;

  const { questionId: initialQuestionId, questionText: initialQuestionText } = parseInterviewSessionState(
    location.state
  );

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

  const { celebrate } = parseReportNavigationState(location.state);

  return (
    <section className="stack-md">
      <button type="button" className="btn-ghost" onClick={() => navigate("/admin/sessions")}>
        Volver a sesiones
      </button>
      <ReportView sessionId={sessionId} celebrate={celebrate} />
    </section>
  );
}
