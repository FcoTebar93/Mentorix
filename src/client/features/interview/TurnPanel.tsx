import { useCallback, useEffect, useMemo, useState } from "react";
import { useInterviewApi } from "../../app/providers/ApiClientsProvider";
import { TurnComposer } from "./TurnComposer";
import { TextTurnComposer } from "./TextTurnComposer";
import { InterviewThread } from "./InterviewThread";
import {
  buildThreadFromSession,
  initialThreadMessage,
  resolveActiveQuestionId,
  type InterviewThreadMessage,
} from "./interview-thread";
import type { InterviewAnswer } from "../../../lib/interview/types";

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
  initialMessages?: InterviewThreadMessage[];
  interviewMode?: TurnMode;
  onCompleted: () => void;
};

export function TurnPanel({
  sessionId,
  initialQuestionId,
  initialQuestionText,
  initialMessages,
  interviewMode: initialInterviewMode,
  onCompleted,
}: Props) {
  const interviewApi = useInterviewApi();
  const [interviewMode, setInterviewMode] = useState<TurnMode>(initialInterviewMode ?? "voice");
  const [messages, setMessages] = useState<InterviewThreadMessage[]>(
    () =>
      initialMessages ??
      [
        initialThreadMessage({
          id: initialQuestionId,
          text: initialQuestionText ?? "Pregunta actual",
        }),
      ]
  );
  const [prefetchedQuestionAudioBase64, setPrefetchedQuestionAudioBase64] = useState<string | null>(
    null
  );
  const [turnPending, setTurnPending] = useState(false);
  const [progress, setProgress] = useState<Progress>({ index: 0, total: null });

  const activeQuestionId = useMemo(() => resolveActiveQuestionId(messages), [messages]);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const res = await interviewApi.getSession(sessionId);
        if (!active) return;
        const session = res.data;
        if (!initialMessages) {
          const fromSession = buildThreadFromSession(session);
          if (fromSession.length > 0) {
            setMessages(fromSession);
          }
        }
        setProgress({
          index: Math.max(0, session.currentQuestionIndex ?? 0),
          total: session.totalQuestions ?? null,
        });
        if (session.interviewMode === "text" || session.interviewMode === "voice") {
          setInterviewMode(session.interviewMode);
        }
      } catch {
        if (!active) return;
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, [sessionId, interviewApi, initialMessages]);

  useEffect(() => {
    if (initialInterviewMode) {
      setInterviewMode(initialInterviewMode);
    }
  }, [initialInterviewMode]);

  const appendUserAnswer = useCallback((answer: Pick<InterviewAnswer, "questionId" | "text" | "source">) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `a:${answer.questionId}`,
        role: "user",
        text: answer.text,
        questionId: answer.questionId,
        source: answer.source,
      },
    ]);
  }, []);

  const appendQuestion = useCallback((next: AdvancePayload) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `q:${next.questionId}`,
        role: "assistant",
        text: next.questionText,
        questionId: next.questionId,
      },
    ]);
    setPrefetchedQuestionAudioBase64(next.prefetchedQuestionAudioBase64 ?? null);
    setProgress((prev) => ({ ...prev, index: prev.index + 1 }));
  }, []);

  const visibleNumber = progress.index + 1;
  const progressLabel =
    progress.total !== null
      ? `Pregunta ${visibleNumber} de ${progress.total}`
      : `Pregunta ${visibleNumber}`;

  if (!activeQuestionId) {
    return null;
  }

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

      <section className="interview-panel">
        <header className="interview-panel-header">
          <h2 className="title-reset">Entrevista en curso</h2>
        </header>

        <InterviewThread messages={messages} pending={turnPending} />

        <div className="interview-composer">
          {interviewMode === "text" ? (
            <TextTurnComposer
              sessionId={sessionId}
              questionId={activeQuestionId}
              onTurnPendingChange={setTurnPending}
              onUserAnswer={appendUserAnswer}
              onNextQuestion={appendQuestion}
              onCompleted={onCompleted}
            />
          ) : (
            <TurnComposer
              sessionId={sessionId}
              activeQuestionId={activeQuestionId}
              prefetchedQuestionAudioBase64={prefetchedQuestionAudioBase64}
              onTurnPendingChange={setTurnPending}
              onUserAnswer={appendUserAnswer}
              onNextQuestion={appendQuestion}
              onCompleted={onCompleted}
            />
          )}
        </div>
      </section>
    </section>
  );
}