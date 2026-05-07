import { useEffect, useState } from "react";
import { TurnComposer } from "../TurnComposer";
import { TextTurnComposer } from "./TextTurnComposer";
import { interviewApi } from "../../lib/api/interview";

type TurnMode = "text" | "voice";

type Progress = {
  index: number;
  total: number | null;
};

type Props = {
  sessionId: string;
  initialQuestionId: string;
  initialQuestionText?: string;
  defaultMode?: TurnMode;
  onCompleted: () => void;
};

export function TurnPanel({
  sessionId,
  initialQuestionId,
  initialQuestionText,
  defaultMode = "text",
  onCompleted,
}: Props) {
  const [mode, setMode] = useState<TurnMode>(defaultMode);
  const [current, setCurrent] = useState({
    id: initialQuestionId,
    text: initialQuestionText ?? "Pregunta actual",
  });
  const [progress, setProgress] = useState<Progress>({ index: 0, total: null });

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const res = await interviewApi.getSession(sessionId);
        if (!active) return;
        const session = res.data;
        setProgress({
          index: Math.max(0, session.currentQuestionIndex ?? 0),
          total: session.totalQuestions ?? null,
        });
      } catch {
        if (!active) return;
      }
    }

    void loadProgress();
    return () => {
      active = false;
    };
  }, [sessionId]);

  function advance(next: { questionId: string; questionText: string }) {
    setCurrent({ id: next.questionId, text: next.questionText });
    setProgress((prev) => ({ ...prev, index: prev.index + 1 }));
  }

  const visibleNumber = progress.index + 1;
  const progressLabel =
    progress.total !== null
      ? `Pregunta ${visibleNumber} de ${progress.total}`
      : `Pregunta ${visibleNumber}`;

  return (
    <section className="stack-md">
      <header className="turn-panel-header">
        <span className="turn-progress-badge" aria-live="polite">
          {progressLabel}
        </span>
        <nav className="turn-mode-toggle row-actions" aria-label="Modo de respuesta">
          <button
            type="button"
            className={mode === "text" ? "is-active" : ""}
            onClick={() => setMode("text")}
          >
            Texto
          </button>
          <button
            type="button"
            className={mode === "voice" ? "is-active" : ""}
            onClick={() => setMode("voice")}
          >
            Voz
          </button>
        </nav>
      </header>

      {mode === "text" ? (
        <TextTurnComposer
          key={`text:${current.id}`}
          sessionId={sessionId}
          questionId={current.id}
          questionText={current.text}
          onAdvance={advance}
          onCompleted={onCompleted}
        />
      ) : (
        <TurnComposer
          key={`voice:${current.id}`}
          sessionId={sessionId}
          initialQuestionId={current.id}
          initialQuestionText={current.text}
          onAdvance={advance}
          onCompleted={onCompleted}
          onSwitchToText={() => setMode("text")}
        />
      )}
    </section>
  );
}
