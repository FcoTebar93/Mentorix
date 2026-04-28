import { useState } from "react";
import { StartInterviewForm } from "./components/StartInterviewForm";
import { TurnComposer } from "./components/TurnComposer";
import { ReportView } from "./components/ReportView";
import { SessionsPage } from "./components/interview/SessionsPage";

type ViewState =
  | { step: "start" }
  | { step: "session"; sessionId: string; questionId: string }
  | { step: "report"; sessionId: string }
  | { step: "sessions" };

export default function App() {
  const [state, setState] = useState<ViewState>({ step: "start" });

  if (state.step === "start") {
    return (
      <section style={{ display: "grid", gap: 12 }}>
        <StartInterviewForm
          onStarted={(sessionId, firstQuestionId) =>
            setState({ step: "session", sessionId, questionId: firstQuestionId })
          }
        />
        <button type="button" onClick={() => setState({ step: "sessions" })}>
          Ver sesiones
        </button>
      </section>
    );
  }

  if (state.step === "sessions") {
    return (
      <SessionsPage
        onBack={() => setState({ step: "start" })}
        onOpenReport={(sessionId: string) => setState({ step: "report", sessionId })}
        onContinue={(sessionId: string) =>
          setState({ step: "session", sessionId, questionId: "" })
        }
      />
    );
  }

  if (state.step === "session") {
    return (
      <TurnComposer
        sessionId={state.sessionId}
        initialQuestionId={state.questionId}
        onCompleted={() => setState({ step: "report", sessionId: state.sessionId })}
      />
    );
  }

  return <ReportView sessionId={state.sessionId} />;
}