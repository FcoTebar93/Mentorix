import { InterviewSession } from "../../domain/interview/session/session.aggregate.js";
import type { SessionAnswer } from "../../domain/interview/session/types.js";
import type { InterviewSessionRepository } from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

export interface SubmitAnswerCommand {
  sessionId: string;
  questionId: string;
  source: "voice" | "text";
  text: string;
}

export class SubmitAnswerCase {
  constructor(
    private readonly sessions: InterviewSessionRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: SubmitAnswerCommand) {
    const stored = await this.sessions.getById(command.sessionId);
    if (!stored) throw new Error("SESSION_NOT_FOUND");

    const session = new InterviewSession(stored);
    const answer: SessionAnswer = {
      id: this.ids.uuid(),
      questionId: command.questionId,
      source: command.source,
      text: command.text,
      receivedAt: this.clock.nowISO(),
    };

    session.receiveAnswer(answer);
    await this.sessions.save(session.state);
    return session.state;
  }
}