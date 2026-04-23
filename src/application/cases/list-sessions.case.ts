import type { InterviewSessionRepository } from "../ports/repositories.js";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";

export interface ListSessionsQuery {
  ownerUserId: string;
  status?: string;
  limit?: number;
}

export class ListSessionsCase {
  constructor(private readonly sessions: InterviewSessionRepository) {}

  async execute(query: ListSessionsQuery): Promise<InterviewSessionProps[]> {
    return this.sessions.list({
      ownerUserId: query.ownerUserId,
      status: query.status,
      limit: query.limit,
    });
  }
}