import type { InterviewSessionRepository } from "../ports/repositories.js";

export interface GetSessionReportQuery {
  sessionId: string;
}

export interface SessionReport {
  sessionId: string;
  status: string;
  overallScore: number | null;
  evaluatedAnswers: number;
  strengths: string[];
  improvements: string[];
  startedAt?: string;
  endedAt?: string;
}

export class GetSessionReportCase {
  constructor(private readonly sessions: InterviewSessionRepository) {}

  async execute(query: GetSessionReportQuery): Promise<SessionReport> {
    const session = await this.sessions.getById(query.sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");
  
    const evaluations = session.evaluations ?? [];
    const scores = evaluations.map((e) => e.score).filter((s) => Number.isFinite(s));
    const overallScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  
    const strengths = Array.from(
      new Set(evaluations.flatMap((e) => e.strengths ?? []).filter(Boolean))
    );
  
    const improvements = Array.from(
      new Set(evaluations.flatMap((e) => e.improvements ?? []).filter(Boolean))
    );
  
    // Dimension averages
    const dimensionAcc: Record<string, { sum: number; count: number }> = {};
    for (const ev of evaluations) {
      const ds = ev.dimensionScores ?? {};
      for (const [key, value] of Object.entries(ds)) {
        if (!Number.isFinite(value)) continue;
        if (!dimensionAcc[key]) dimensionAcc[key] = { sum: 0, count: 0 };
        dimensionAcc[key].sum += value;
        dimensionAcc[key].count += 1;
      }
    }
  
    const dimensionAverages: Record<string, number> = {};
    for (const [key, acc] of Object.entries(dimensionAcc)) {
      dimensionAverages[key] = Math.round(acc.sum / acc.count);
    }
  
    // Confidence average
    const confidences = evaluations
      .map((e) => e.confidence)
      .filter((c) => Number.isFinite(c));
    const confidenceAverage =
      confidences.length > 0
        ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2)) : null;

    return {
      sessionId: session.id,
      status: session.status,
      overallScore: overallScore,
      evaluatedAnswers: evaluations.length,
      strengths: strengths,
      improvements: improvements,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
  }
}