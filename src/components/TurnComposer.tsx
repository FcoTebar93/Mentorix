import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { interviewApi } from "../lib/api/interview";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../lib/interview/rubric";

type Props = {
  sessionId: string;
  initialQuestionId: string;
  initialQuestionText?: string;
  onCompleted: () => void;
};

export function TurnComposer({
  sessionId,
  initialQuestionId,
  initialQuestionText,
  onCompleted,
}: Props) {
  const [questionId, setQuestionId] = useState(initialQuestionId);
  const [questionText, setQuestionText] = useState(initialQuestionText ?? "Pregunta actual");
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !!questionId && !!answerText.trim() && !loading,
    [questionId, answerText, loading]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await interviewApi.completeTurn(sessionId, {
        questionId,
        source: "text",
        text: answerText.trim(),
        rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
      });

      const data = res.data;

      if (data.isCompleted) {
        onCompleted();
        return;
      }

      if (data.nextQuestion?.id) {
        setQuestionId(data.nextQuestion.id);
        setQuestionText(data.nextQuestion.text ?? "Siguiente pregunta");
        setAnswerText("");
      } else {
        setErrorMsg("El backend no devolvió la siguiente pregunta.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error enviando respuesta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 12, maxWidth: 700 }}>
      <h2>Entrevista en curso</h2>

      <div>
        <strong>Pregunta:</strong>
        <p>{questionText}</p>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <textarea
          rows={6}
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Escribe tu respuesta"
        />

        <button type="submit" disabled={!canSubmit}>
          {loading ? "Enviando..." : "Enviar respuesta"}
        </button>
      </form>

      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}
    </section>
  );
}