import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useInterviewApi } from "../../app/providers/ApiClientsProvider";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../../../lib/interview/rubric";
import { ErrorBanner } from "../../shared/components/ErrorBanner";
import { humanizeError, type HumanError } from "../../../lib/errors/humanize";
import type { InterviewAnswer } from "../../../lib/interview/types";

type AdvancePayload = {
  questionId: string;
  questionText: string;
  prefetchedQuestionAudioBase64?: string | null;
};

type Props = {
  sessionId: string;
  questionId: string;
  onTurnPendingChange: (pending: boolean) => void;
  onUserAnswer: (answer: Pick<InterviewAnswer, "questionId" | "text" | "source">) => void;
  onNextQuestion: (next: AdvancePayload) => void;
  onCompleted: () => void;
};

const MIN_ANSWER_CHARS = 5;

export function TextTurnComposer({
  sessionId,
  questionId,
  onTurnPendingChange,
  onUserAnswer,
  onNextQuestion,
  onCompleted,
}: Props) {
  const interviewApi = useInterviewApi();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<HumanError | null>(null);

  useEffect(() => {
    onTurnPendingChange(loading);
  }, [loading, onTurnPendingChange]);

  const trimmedLength = text.trim().length;
  const canSubmit = trimmedLength >= MIN_ANSWER_CHARS && !loading;

  async function submit() {
    if (!canSubmit) return;

    const answerText = text.trim();
    setErrorState(null);
    setLoading(true);

    try {
      const res = await interviewApi.completeTurn(sessionId, {
        questionId,
        source: "text",
        text: answerText,
        rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
      });

      const result = res.data;
      onUserAnswer({ questionId, text: answerText, source: "text" });
      setText("");

      if (result.isCompleted) {
        onCompleted();
        return;
      }

      if (result.nextQuestion?.id) {
        onNextQuestion({
          questionId: result.nextQuestion.id,
          questionText: result.nextQuestion.text ?? "Siguiente pregunta",
        });
        return;
      }

      setErrorState({
        title: "Respuesta sin continuación",
        message: "El servidor no devolvió la siguiente pregunta. Intenta de nuevo.",
        retry: true,
        fallbackToText: false,
      });
    } catch (err) {
      setErrorState(humanizeError(err));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <>
      {errorState ? (
        <div className="composer-error">
          <ErrorBanner error={errorState} onRetry={() => void submit()} />
        </div>
      ) : null}

      <form className="composer-sticky" onSubmit={onSubmit}>
        <label className="form-stack">
          <span className="message-meta">Tu respuesta</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Escribe tu respuesta aqui..."
            rows={5}
            disabled={loading}
          />
        </label>

        <div className="row-actions">
          <span className="message-meta">
            {trimmedLength < MIN_ANSWER_CHARS
              ? `Minimo ${MIN_ANSWER_CHARS} caracteres`
              : `${trimmedLength} caracteres`}
          </span>
          <button type="submit" disabled={!canSubmit}>
            {loading ? "Enviando..." : "Enviar respuesta"}
          </button>
        </div>
      </form>
    </>
  );
}