import { useEffect, useState } from "react";
import { interviewApi } from "../../lib/api/interview";
import { TurnComposer } from "../TurnComposer";

type Props = {
  sessionId: string;
  onBack: () => void;
  onCompleted: () => void;
};

export function SessionLoader({ sessionId, onBack, onCompleted }: Props) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);

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

        setQuestionId(currentQuestion.id);
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
      <section style={{ display: "grid", gap: 12 }}>
        <button type="button" onClick={onBack}>Volver</button>
        <p>Cargando sesión...</p>
      </section>
    );
  }

  if (errorMsg) {
    return (
      <section style={{ display: "grid", gap: 12 }}>
        <button type="button" onClick={onBack}>Volver</button>
        <p style={{ color: "crimson" }}>{errorMsg}</p>
      </section>
    );
  }

  if (!questionId) return null;

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <button type="button" onClick={onBack}>Volver</button>
      <TurnComposer
        sessionId={sessionId}
        initialQuestionId={questionId}
        onCompleted={onCompleted}
      />
    </section>
  );
}