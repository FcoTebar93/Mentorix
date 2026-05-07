import { useEffect, useState } from "react";
import { interviewApi } from "../../lib/api/interview";
import { TurnPanel } from "./TurnPanel";
import { ErrorBanner } from "../ErrorBanner";
import { humanizeError, type HumanError } from "../../lib/errors/humanize";

type Props = {
  sessionId: string;
  onBack: () => void;
  onCompleted: () => void;
};

export function SessionLoader({ sessionId, onBack, onCompleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<HumanError | null>(null);
  const [question, setQuestion] = useState<{ id: string; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorState(null);

      try {
        const res = await interviewApi.getSession(sessionId);
        if (!active) return;

        const session = res.data;
        const idx = Math.max(0, session.currentQuestionIndex ?? 0);
        const currentQuestion = session.questions?.[idx];

        if (!currentQuestion?.id) {
          setErrorState({
            title: "Sesión incompleta",
            message: "No se pudo resolver la pregunta actual de esta sesión.",
            retry: true,
            fallbackToText: false,
          });
          return;
        }

        setQuestion({
          id: currentQuestion.id,
          text: currentQuestion.text ?? "Pregunta actual",
        });
      } catch (err) {
        if (!active) return;
        setErrorState(humanizeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [sessionId, reloadKey]);

  if (loading) {
    return (
      <section className="stack-md">
        <button type="button" onClick={onBack}>Volver</button>
        <p>Cargando sesión...</p>
      </section>
    );
  }

  if (errorState) {
    return (
      <section className="stack-md">
        <button type="button" onClick={onBack}>Volver</button>
        <ErrorBanner error={errorState} onRetry={() => setReloadKey((k) => k + 1)} />
      </section>
    );
  }

  if (!question) return null;

  return (
    <section className="stack-md">
      <button type="button" onClick={onBack}>Volver</button>
      <TurnPanel
        sessionId={sessionId}
        initialQuestionId={question.id}
        initialQuestionText={question.text}
        onCompleted={onCompleted}
      />
    </section>
  );
}
