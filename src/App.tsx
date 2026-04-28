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
import { templatesApi } from "./modules/templates/templates.api";
import type { CreateTemplateInput, InterviewTemplate } from "./modules/templates/types";
type ViewState =
  | { step: "start" }
  | { step: "session"; sessionId: string; questionId?: string }
  | { step: "report"; sessionId: string }
  | { step: "sessions" }
  | { step: "templates:list" }
  | { step: "templates:new" }
  | { step: "templates:edit"; templateId: string };

export default function App() {
  const [state, setState] = useState<ViewState>({ step: "start" });
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

  if (state.step === "start") {
    content = (
      <section style={{ display: "grid", gap: 12 }}>
        <StartInterviewForm
          onStarted={(sessionId: string, firstQuestionId: string) =>
            setState({ step: "session", sessionId, questionId: firstQuestionId })
          }
        />
        <button type="button" onClick={() => setState({ step: "sessions" })}>
          Ver sesiones
        </button>
        <button type="button" onClick={() => setState({ step: "templates:list" })}>
          Entrevistas
        </button>
      </section>
    );
  } else if (state.step === "sessions") {
    content = (
      <SessionsPage
        onBack={() => setState({ step: "start" })}
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
        <section style={{ display: "grid", gap: 12 }}>
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
  } else {
    if (templateLoading) {
      content = <p>Cargando plantilla...</p>;
    } else if (templateError) {
      content = <p style={{ color: "crimson" }}>{templateError}</p>;
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
  }

  return (
    <AuthGuard>
      <section style={{ display: "grid", gap: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Mentorix Panel {user?.email ? `- ${user.email}` : ""}</strong>
          <button type="button" onClick={logout}>
            Salir
          </button>
        </header>
        {content}
      </section>
    </AuthGuard>
  );
}
