import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { StartInterviewForm } from "./components/StartInterviewForm";
import { TurnComposer } from "./components/TurnComposer";
import { ReportView } from "./components/ReportView";
import { SessionsPage } from "./components/interview/SessionsPage";
import { SessionLoader } from "./components/interview/SessionLoader";
import { AuthGuard } from "./modules/auth/AuthGuard";
import { useAuth } from "./modules/auth/AuthContext";
import { TemplateListPage } from "./modules/templates/TemplateListPage";
import { TemplateForm } from "./modules/templates/TemplateForm";
import { TemplateLinksPage } from "./modules/templates/TemplateLinksPage";
import { templatesApi } from "./modules/templates/templates.api";
import type { CreateTemplateInput, InterviewTemplate } from "./modules/templates/types";
type ViewState =
  | { step: "session"; sessionId: string; questionId?: string }
  | { step: "report"; sessionId: string }
  | { step: "sessions" }
  | { step: "templates:list" }
  | { step: "templates:new" }
  | { step: "templates:edit"; templateId: string }
  | { step: "templates:links"; templateId: string }
  | { step: "templates:results"; templateId: string };

type CandidateState =
  | { step: "start" }
  | { step: "session"; sessionId: string; questionId?: string }
  | { step: "report"; sessionId: string };

function getCandidateTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname } = window.location;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "interview" || !parts[1]) return null;
  return decodeURIComponent(parts[1]);
}

export default function App() {
  const candidateToken = getCandidateTokenFromLocation();
  const isCandidateView = !!candidateToken;
  const [state, setState] = useState<ViewState>({ step: "templates:list" });
  const [candidateState, setCandidateState] = useState<CandidateState>({ step: "start" });
  const { logout, user } = useAuth();

  const [editingTemplate, setEditingTemplate] = useState<InterviewTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (state.step !== "templates:edit") return;
    const templateId = state.templateId;

    let active = true;
    async function loadTemplate() {
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const res = await templatesApi.getById(templateId);
        if (!active) return;
        setEditingTemplate(res.data);
      } catch (err) {
        if (!active) return;
        setTemplateError(err instanceof Error ? err.message : "No se pudo cargar la plantilla");
      } finally {
        if (active) setTemplateLoading(false);
      }
    }

    loadTemplate();
    return () => {
      active = false;
    };
  }, [state]);

  let content: ReactElement;
  const activeAdminTab =
    state.step.startsWith("templates:")
      ? "templates"
      : "sessions";

  if (isCandidateView) {
    if (candidateState.step === "start") {
      content = (
        <StartInterviewForm
          presetToken={candidateToken ?? ""}
          showTokenField={false}
          onStarted={(sessionId: string, firstQuestionId: string) =>
            setCandidateState({ step: "session", sessionId, questionId: firstQuestionId })
          }
        />
      );
    } else if (candidateState.step === "session") {
      if (!candidateState.questionId) {
        content = (
          <SessionLoader
            sessionId={candidateState.sessionId}
            onBack={() => setCandidateState({ step: "start" })}
            onCompleted={() => setCandidateState({ step: "report", sessionId: candidateState.sessionId })}
          />
        );
      } else {
        content = (
          <TurnComposer
            sessionId={candidateState.sessionId}
            initialQuestionId={candidateState.questionId}
            onCompleted={() => setCandidateState({ step: "report", sessionId: candidateState.sessionId })}
          />
        );
      }
    } else {
      content = <ReportView sessionId={candidateState.sessionId} />;
    }

    return (
      <section className="candidate-shell">
        <section className="candidate-card">{content}</section>
      </section>
    );
  }

  if (state.step === "sessions") {
    content = (
      <SessionsPage
        onBack={() => setState({ step: "templates:list" })}
        onOpenReport={(sessionId: string) => setState({ step: "report", sessionId })}
        onContinue={(sessionId: string) => setState({ step: "session", sessionId })}
      />
    );
  } else if (state.step === "session") {
    if (!state.questionId) {
      content = (
        <SessionLoader
          sessionId={state.sessionId}
          onBack={() => setState({ step: "sessions" })}
          onCompleted={() => setState({ step: "report", sessionId: state.sessionId })}
        />
      );
    } else {
      content = (
        <section className="stack-md">
          <button type="button" onClick={() => setState({ step: "sessions" })}>
            Volver
          </button>
          <TurnComposer
            sessionId={state.sessionId}
            initialQuestionId={state.questionId}
            onCompleted={() => setState({ step: "report", sessionId: state.sessionId })}
          />
        </section>
      );
    }
  } else if (state.step === "report") {
    content = <ReportView sessionId={state.sessionId} />;
  } else if (state.step === "templates:list") {
    content = (
      <TemplateListPage
        onCreate={() => setState({ step: "templates:new" })}
        onEdit={(templateId: string) => setState({ step: "templates:edit", templateId })}
        onLinks={(templateId: string) => setState({ step: "templates:links", templateId })}
        onResults={(templateId: string) => setState({ step: "templates:results", templateId })}
      />
    );
  } else if (state.step === "templates:new") {
    content = (
      <TemplateForm
        submitLabel="Crear entrevista"
        onCancel={() => setState({ step: "templates:list" })}
        onSubmit={async (payload: CreateTemplateInput) => {
          await templatesApi.create(payload);
          setState({ step: "templates:list" });
        }}
      />
    );
  } else if (state.step === "templates:edit") {
    if (templateLoading) {
      content = <p>Cargando plantilla...</p>;
    } else if (templateError) {
      content = <p className="error-text">{templateError}</p>;
    } else if (!editingTemplate) {
      content = <p>No se encontró la plantilla.</p>;
    } else {
      content = (
        <TemplateForm
          initial={editingTemplate}
          submitLabel="Guardar cambios"
          onCancel={() => setState({ step: "templates:list" })}
          onSubmit={async (payload: CreateTemplateInput) => {
            await templatesApi.update(editingTemplate.id, payload);
            setState({ step: "templates:list" });
          }}
        />
      );
    }
  } else if (state.step === "templates:links") {
    content = <TemplateLinksPage templateId={state.templateId} onBack={() => setState({ step: "templates:list" })} />;
  } else {
    content = (
      <section className="stack-md">
        <h2>Resultados de entrevista</h2>
        <p>Template ID: {state.templateId}</p>
        <p>Aqui conectaremos metricas y sesiones filtradas por entrevista.</p>
        <button type="button" onClick={() => setState({ step: "templates:list" })}>
          Volver a entrevistas
        </button>
      </section>
    );
  }

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
              className={activeAdminTab === "templates" ? "is-active" : ""}
              onClick={() => setState({ step: "templates:list" })}
            >
              Entrevistas
            </button>
            <button
              type="button"
              className={activeAdminTab === "sessions" ? "is-active" : ""}
              onClick={() => setState({ step: "sessions" })}
            >
              Sesiones
            </button>
          </nav>
          <button type="button" className="btn-ghost" onClick={logout}>
            Salir
          </button>
        </header>
        <section className="page-content">
          {content}
        </section>
      </section>
    </AuthGuard>
  );
}
