import { useEffect, useState } from "react";
import { useInterviewApi } from "../../app/providers/ApiClientsProvider";
import { TurnComposer } from "./TurnComposer";
import { TextTurnComposer } from "./TextTurnComposer";

type TurnMode = "text" | "voice";

type Progress = {
  index: number;
  total: number | null;
};

type AdvancePayload = {
  questionId: string;
  questionText: string;
  prefetchedQuestionAudioBase64?: string | null;
};

type Props = {
  sessionId: string;
  initialQuestionId: string;
  initialQuestionText?: string;
  interviewMode?: TurnMode;
  onCompleted: () => void;
};

export function TurnPanel({
  sessionId,
  initialQuestionId,
  initialQuestionText,
  interviewMode = "voice",
  onCompleted,
}: Props) {
  const interviewApi = useInterviewApi();
  const [current, setCurrent] = useState({
    id: initialQuestionId,
    text: initialQuestionText ?? "Pregunta actual",
    prefetchedQuestionAudioBase64: null as string | null,
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
  }, [sessionId, interviewApi]);

  function advance(next: AdvancePayload) {
    setCurrent({
      id: next.questionId,
      text: next.questionText,
      prefetchedQuestionAudioBase64: next.prefetchedQuestionAudioBase64 ?? null,
    });
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
        <span className="turn-progress-badge" aria-live="polite">
          {interviewMode === "voice" ? "Modo voz" : "Modo texto"}
        </span>
      </header>

      {interviewMode === "text" ? (
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
          prefetchedQuestionAudioBase64={current.prefetchedQuestionAudioBase64}
          onAdvance={advance}
          onCompleted={onCompleted}
        />
      )}
    </section>
  );
}
