import { useState } from "react";
import type { FormEvent } from "react";
import { interviewApi } from "../../lib/api/interview";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../../lib/interview/rubric";
import { ErrorBanner } from "../ErrorBanner";
import { humanizeError, type HumanError } from "../../lib/errors/humanize";

type Props = {
  sessionId: string;
  questionId: string;
  questionText: string;
  onAdvance: (next: { questionId: string; questionText: string }) => void;
  onCompleted: () => void;
};

const MIN_ANSWER_CHARS = 5;

export function TextTurnComposer({
  sessionId,
  questionId,
  questionText,
  onAdvance,
  onCompleted,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<HumanError | null>(null);

  const trimmedLength = text.trim().length;
  const canSubmit = trimmedLength >= MIN_ANSWER_CHARS && !loading;

  async function submit() {
    if (!canSubmit) return;

    setErrorState(null);
    setLoading(true);

    try {
      const res = await interviewApi.completeTurn(sessionId, {
        questionId,
        source: "text",
        text: text.trim(),
        rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
      });

      const result = res.data;
      if (result.isCompleted) {
        onCompleted();
        return;
      }

      if (result.nextQuestion?.id) {
        onAdvance({
          questionId: result.nextQuestion.id,
          questionText: result.nextQuestion.text ?? "Siguiente pregunta",
        });
        setText("");
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
    <section className="interview-panel">
      <header className="interview-panel-header">
        <h2 className="title-reset">Entrevista en curso</h2>
        <span className={`status-pill ${loading ? "is-pulsing" : ""}`}>
          {loading ? "Enviando..." : "Listo para responder"}
        </span>
      </header>

      <section className="chat-container">
        <article className="message-row message-ai">
          <div className="message-bubble level-2">
            <p className="message-meta">AI Interviewer</p>
            <p className="text-reset">{questionText}</p>
          </div>
        </article>

        {errorState ? <ErrorBanner error={errorState} onRetry={() => void submit()} /> : null}
      </section>

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
    </section>
  );
}
