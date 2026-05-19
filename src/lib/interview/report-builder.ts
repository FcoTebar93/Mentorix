import type { InterviewSessionProps, SessionQuestion } from "../../domain/interview/session/types.js";
import type { SessionReport, SessionReportTurn } from "./types.js";
import { normalizeDimensionScores, normalizeScoreValue } from "./report-scores.js";

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

/** Reconstruye preguntas faltantes a partir de respuestas (sesiones antiguas o datos incompletos). */
export function reconcileSessionQuestions(session: InterviewSessionProps): SessionQuestion[] {
  const byId = new Map(session.questions.map((question) => [question.id, question]));
  let maxIndex = session.questions.reduce((max, question) => Math.max(max, question.index), 0);

  const answersSorted = [...session.answers].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));

  for (const answer of answersSorted) {
    if (byId.has(answer.questionId)) continue;
    maxIndex += 1;
    byId.set(answer.questionId, {
      id: answer.questionId,
      index: maxIndex,
      text: answer.questionText?.trim() || `Pregunta ${maxIndex}`,
      generatedByModel: "recovered",
      source: "fixed",
      createdAt: answer.receivedAt,
    });
  }

  return [...byId.values()].sort((a, b) => a.index - b.index);
}

export function buildSessionReportTurns(session: InterviewSessionProps): SessionReportTurn[] {
  const answersByQuestion = new Map(session.answers.map((answer) => [answer.questionId, answer]));
  const evaluationByAnswer = new Map(
    (session.evaluations ?? []).map((evaluation) => [evaluation.answerId, evaluation])
  );
  const feedbackByAnswer = new Map(
    (session.feedbackItems ?? []).map((feedback) => [feedback.answerId, feedback])
  );

  const questions = reconcileSessionQuestions(session);

  return questions.map((question) => {
    const answer = answersByQuestion.get(question.id);
    const evaluation = answer ? evaluationByAnswer.get(answer.id) : undefined;
    const feedback = answer ? feedbackByAnswer.get(answer.id) : undefined;

    const dimensionScores = evaluation?.dimensionScores
      ? normalizeDimensionScores(evaluation.dimensionScores)
      : {};

    const rawScore = evaluation?.score;
    const score =
      rawScore !== undefined && Number.isFinite(rawScore)
        ? rawScore > 10 && rawScore <= 100
          ? Math.round(rawScore)
          : normalizeScoreValue(rawScore)
        : null;

    return {
      questionIndex: question.index,
      questionId: question.id,
      questionText: question.text,
      answerText: answer?.text ?? null,
      answerSource: answer?.source ?? null,
      score,
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

export function computeDimensionAverages(
  session: InterviewSessionProps
): Record<string, number> {
  const dimensionAcc: Record<string, { sum: number; count: number }> = {};

  for (const evaluation of session.evaluations ?? []) {
    const normalized = normalizeDimensionScores(evaluation.dimensionScores ?? {});
    for (const [key, value] of Object.entries(normalized)) {
      if (!dimensionAcc[key]) dimensionAcc[key] = { sum: 0, count: 0 };
      dimensionAcc[key].sum += value;
      dimensionAcc[key].count += 1;
    }
  }

  const dimensionAverages: Record<string, number> = {};
  for (const [key, acc] of Object.entries(dimensionAcc)) {
    dimensionAverages[key] = Math.round(acc.sum / acc.count);
  }
  return dimensionAverages;
}

/** Completa un reporte del API con datos de la sesión (turnos, promedios). */
export function enrichReportWithSession(
  apiReport: SessionReport,
  session: InterviewSessionProps
): SessionReport {
  const turns = buildSessionReportTurns(session);
  const dimensionAverages = computeDimensionAverages(session);

  return {
    ...apiReport,
    turns: turns.length > 0 ? turns : apiReport.turns ?? [],
    dimensionAverages:
      Object.keys(dimensionAverages).length > 0
        ? dimensionAverages
        : apiReport.dimensionAverages ?? {},
    overallScore: apiReport.overallScore,
    evaluatedAnswers: Math.max(apiReport.evaluatedAnswers, session.evaluations?.length ?? 0),
  };
}
