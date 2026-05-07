import { useState } from "react";
import { TurnComposer } from "../TurnComposer";
import { TextTurnComposer } from "./TextTurnComposer";

type TurnMode = "text" | "voice";

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

  function advance(next: { questionId: string; questionText: string }) {
    setCurrent({ id: next.questionId, text: next.questionText });
  }

  return (
    <section className="stack-md">
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
        />
      )}
    </section>
  );
}
