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

    return {
      sessionId: session.id,
      status: session.status,
      overallScore,
      evaluatedAnswers: evaluations.length,
      strengths,
      improvements,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };
  }
}