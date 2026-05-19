import type { InterviewSessionRepository } from "../ports/repositories.js";
import type { SessionReport } from "../../lib/interview/types.js";
import {
  buildSessionReportTurns,
  computeDimensionAverages,
  pickGlobalThemes,
} from "../../lib/interview/report-builder.js";
import { normalizeScoreValue } from "../../lib/interview/report-scores.js";

export interface GetSessionReportQuery {
  sessionId: string;
  ownerUserId: string;
}

export type { SessionReport };

export class GetSessionReportCase {
  constructor(private readonly sessions: InterviewSessionRepository) {}

  async execute(query: GetSessionReportQuery): Promise<SessionReport> {
    const session = await this.sessions.getByIdForOwner(query.sessionId, query.ownerUserId);
    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    const evaluations = session.evaluations ?? [];
    const scores = evaluations
      .map((e) => e.score)
      .filter((s) => Number.isFinite(s))
      .map((s) => normalizeScoreValue(s));
    const overallScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const dimensionAverages = computeDimensionAverages(session);

    const confidences = evaluations.map((e) => e.confidence).filter((c) => Number.isFinite(c));
    const confidenceAverage =
      confidences.length > 0
        ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
        : null;

    const turns = buildSessionReportTurns(session);

    const strengths = pickGlobalThemes(evaluations.map((e) => e.strengths ?? []));
    const improvements = pickGlobalThemes(evaluations.map((e) => e.improvements ?? []));

    const recommendation =
      overallScore === null
        ? "No hay suficientes evaluaciones para recomendar una decisión."
        : overallScore >= 80
          ? "Recomendado para avanzar a la siguiente etapa."
          : overallScore >= 60
            ? "Recomendado con reservas: revisar dimensiones con menor puntaje."
            : "No recomendado por ahora: reforzar fundamentos antes de continuar.";

    return {
      sessionId: session.id,
      status: session.status,
      overallScore,
      evaluatedAnswers: evaluations.length,
      strengths,
      improvements,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      dimensionAverages,
      confidenceAverage,
      recommendation,
      turns,
    };
  }
}
