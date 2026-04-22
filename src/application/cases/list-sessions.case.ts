import type { InterviewSessionRepository } from "../ports/repositories.js";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";

export interface ListSessionsQuery {
  status?: string;
  limit?: number;
}

export class ListSessionsCase {
  constructor(private readonly sessions: InterviewSessionRepository) {}

  async execute(query: ListSessionsQuery = {}): Promise<InterviewSessionProps[]> {
    return this.sessions.list({
      status: query.status,
      limit: query.limit,
    });
  }
}