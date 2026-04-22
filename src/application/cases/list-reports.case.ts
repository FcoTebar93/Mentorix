import type { InterviewSessionRepository } from "../ports/repositories.js";

export type TrafficLight = "GREEN" | "YELLOW" | "RED" | "GRAY";

export interface ListSessionReportsQuery {
  status?: string;
  limit?: number;
}

export interface SessionReportListItem {
  sessionId: string;
  status: string;
  evaluatedAnswers: number;
  overallScore: number | null;
  confidenceAverage: number | null;
  trafficLight: TrafficLight;
  startedAt?: string;
  endedAt?: string;
}

function toTrafficLight(overallScore: number | null): TrafficLight {
  if (overallScore === null) return "GRAY";
  if (overallScore >= 80) return "GREEN";
  if (overallScore >= 60) return "YELLOW";
  return "RED";
}

export class ListSessionReportsCase {
  constructor(private readonly sessions: InterviewSessionRepository) {}

  async execute(query: ListSessionReportsQuery = {}): Promise<SessionReportListItem[]> {
    const sessions = await this.sessions.list({
      status: query.status,
      limit: query.limit,
    });

    return sessions.map((session) => {
      const evaluations = session.evaluations ?? [];

      const scores = evaluations
        .map((e) => e.score)
        .filter((s): s is number => Number.isFinite(s));

      const overallScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

      const confidences = evaluations
        .map((e) => e.confidence)
        .filter((c): c is number => Number.isFinite(c));

      const confidenceAverage =
        confidences.length > 0
          ? Number((confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(2))
          : null;

      return {
        sessionId: session.id,
        status: session.status,
        evaluatedAnswers: evaluations.length,
        overallScore,
        confidenceAverage,
        trafficLight: toTrafficLight(overallScore),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      };
    });
  }
}