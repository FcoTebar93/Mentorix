import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import type { SessionReportTurn } from "./types.js";
import { normalizePercentScale } from "./report-scores.js";

/** Temas globales: prioriza los que se repiten en varios turnos. */
export function pickGlobalThemes(lists: string[][], maxItems = 5): string[] {
  const counts = new Map<string, number>();

  for (const list of lists) {
    const seenInTurn = new Set<string>();
    for (const raw of list) {
      const text = raw.trim();
      if (!text) continue;
      const dedupeKey = text.toLowerCase();
      if (seenInTurn.has(dedupeKey)) continue;
      seenInTurn.add(dedupeKey);
      counts.set(text, (counts.get(text) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, maxItems)
    .map(([text]) => text);
}

export function buildSessionReportTurns(
  session: InterviewSessionProps,
  dimensionScaleIsTenPoint: boolean
): SessionReportTurn[] {
  const answersByQuestion = new Map(session.answers.map((answer) => [answer.questionId, answer]));
  const evaluationByAnswer = new Map(
    (session.evaluations ?? []).map((evaluation) => [evaluation.answerId, evaluation])
  );
  const feedbackByAnswer = new Map(
    (session.feedbackItems ?? []).map((feedback) => [feedback.answerId, feedback])
  );

  return [...session.questions]
    .sort((a, b) => a.index - b.index)
    .map((question) => {
      const answer = answersByQuestion.get(question.id);
      const evaluation = answer ? evaluationByAnswer.get(answer.id) : undefined;
      const feedback = answer ? feedbackByAnswer.get(answer.id) : undefined;

      const dimensionScores: Record<string, number> = {};
      if (evaluation?.dimensionScores) {
        for (const [key, value] of Object.entries(evaluation.dimensionScores)) {
          if (!Number.isFinite(value)) continue;
          dimensionScores[key] = normalizePercentScale(value, dimensionScaleIsTenPoint);
        }
      }

      return {
        questionIndex: question.index,
        questionId: question.id,
        questionText: question.text,
        answerText: answer?.text ?? null,
        answerSource: answer?.source ?? null,
        score:
          evaluation && Number.isFinite(evaluation.score) ? Math.round(evaluation.score) : null,
        confidence:
          evaluation && Number.isFinite(evaluation.confidence) ? evaluation.confidence : null,
        dimensionScores,
        strengths: evaluation?.strengths ?? [],
        improvements: evaluation?.improvements ?? [],
        feedback: feedback?.text ?? null,
      };
    });
}

export function formatDimensionLabel(key: string): string {
  return key.replace(/_/g, " ");
}
