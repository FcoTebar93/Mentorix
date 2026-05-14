import { useEffect, useState } from "react";
import { useInterviewApi } from "../../app/providers/ApiClientsProvider";
import { TurnPanel } from "./TurnPanel";
import { ErrorBanner } from "../../shared/components/ErrorBanner";
import { humanizeError, type HumanError } from "../../../lib/errors/humanize";
import { DEFAULT_RUBRIC_DIMENSIONS } from "../../../lib/interview/rubric";
import type { InterviewApi } from "../../shared/lib/api/interview-api";
import type { CompleteTurnResult, InterviewSession } from "../../../lib/interview/types";

type Props = {
  sessionId: string;
  onBack: () => void;
  onCompleted: () => void;
};

export function SessionLoader({ sessionId, onBack, onCompleted }: Props) {
  const interviewApi = useInterviewApi();
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Cargando sesión...");
  const [loadingDetail, setLoadingDetail] = useState("Estamos buscando el último punto guardado.");
  const [errorState, setErrorState] = useState<HumanError | null>(null);
  const [question, setQuestion] = useState<{ id: string; text: string } | null>(null);
  const [interviewMode, setInterviewMode] = useState<"text" | "voice">("voice");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadingMessage("Cargando sesión...");
      setLoadingDetail("Estamos buscando el último punto guardado.");
      setErrorState(null);

      try {
        const res = await interviewApi.getSession(sessionId);
        if (!active) return;

        const session = res.data;
        setInterviewMode(session.interviewMode ?? "voice");
        if (isRecoverableTurnState(session.status)) {
          setLoadingMessage("Recuperando tu progreso...");
          setLoadingDetail(
            "Detectamos que el turno anterior se quedó a medias. Vamos a cerrarlo con tu última respuesta guardada."
          );
          const recovered = await recoverInterruptedTurn(interviewApi, session);
          if (!active) return;

          if (recovered.isCompleted) {
            onCompleted();
            return;
          }

          if (recovered.nextQuestion?.id) {
            setQuestion({
              id: recovered.nextQuestion.id,
              text: recovered.nextQuestion.text ?? "Pregunta actual",
            });
            return;
          }

          setErrorState({
            title: "No se pudo recuperar el turno",
            message: "La sesión quedó en un estado intermedio y el servidor no devolvió la siguiente pregunta.",
            retry: true,
            fallbackToText: false,
          });
          return;
        }

        const currentQuestion = resolveCurrentQuestion(session);

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
  }, [sessionId, reloadKey, onCompleted, interviewApi]);

  if (loading) {
    return (
      <section className="stack-md">
        <button type="button" onClick={onBack}>Volver</button>
        <div className="session-loading-card" role="status" aria-live="polite">
          <span className="status-pill is-pulsing">{loadingMessage}</span>
          <p>{loadingDetail}</p>
        </div>
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
        interviewMode={interviewMode}
        onCompleted={onCompleted}
      />
    </section>
  );
}

function isRecoverableTurnState(status: string): boolean {
  return status === "EVALUATING" || status === "FEEDBACKING";
}

function resolveCurrentQuestion(session: InterviewSession) {
  const idx = Math.max(0, session.currentQuestionIndex ?? 0);
  return session.questions?.[idx];
}

async function recoverInterruptedTurn(
  api: InterviewApi,
  session: InterviewSession
): Promise<CompleteTurnResult> {
  const answers = session.answers ?? [];
  const lastAnswer = answers[answers.length - 1];
  if (!lastAnswer?.questionId || !lastAnswer.text) {
    throw new Error("TURN_RESUME_INVALID_STATE");
  }

  const res = await api.completeTurn(session.id, {
    questionId: lastAnswer.questionId,
    source: lastAnswer.source,
    text: lastAnswer.text,
    rubricDimensions: DEFAULT_RUBRIC_DIMENSIONS,
  });

  return res.data;
}
