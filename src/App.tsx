import { useState } from "react";
import type { ReactElement } from "react";
import { StartInterviewForm } from "./components/StartInterviewForm";
import { TurnComposer } from "./components/TurnComposer";
import { ReportView } from "./components/ReportView";
import { SessionsPage } from "./components/interview/SessionsPage";
import { SessionLoader } from "./components/interview/SessionLoader";
import { AuthGuard } from "./modules/auth/AuthGuard";
import { useAuth } from "./modules/auth/AuthContext";

type ViewState =
  | { step: "start" }
  | { step: "session"; sessionId: string; questionId?: string }
  | { step: "report"; sessionId: string }
  | { step: "sessions" };

export default function App() {
  const [state, setState] = useState<ViewState>({ step: "start" });
  const { logout, user } = useAuth();

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
  } else {
    content = <ReportView sessionId={state.sessionId} />;
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