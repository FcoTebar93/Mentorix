import { useEffect, useState } from "react";
import { interviewApi } from "../../lib/api/interview";
import { TurnPanel } from "./TurnPanel";

type Props = {
  sessionId: string;
  onBack: () => void;
  onCompleted: () => void;
};

export function SessionLoader({ sessionId, onBack, onCompleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [question, setQuestion] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await interviewApi.getSession(sessionId);
        if (!active) return;

        const session = res.data;
        const idx = Math.max(0, session.currentQuestionIndex ?? 0);
        const currentQuestion = session.questions?.[idx];

        if (!currentQuestion?.id) {
          setErrorMsg("No se pudo resolver la pregunta actual.");
          return;
        }

        setQuestion({
          id: currentQuestion.id,
          text: currentQuestion.text ?? "Pregunta actual",
        });
      } catch (err) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : "No se pudo cargar la sesión.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <section className="stack-md">
        <button type="button" onClick={onBack}>Volver</button>
        <p>Cargando sesión...</p>
      </section>
    );
  }

  if (errorMsg) {
    return (
      <section className="stack-md">
        <button type="button" onClick={onBack}>Volver</button>
        <p className="error-text">{errorMsg}</p>
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