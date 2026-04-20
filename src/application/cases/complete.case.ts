import { InterviewSession } from "../../domain/interview/session/session.aggregate";
import { InterviewSessionRepository } from "../ports/repositories";
import { Clock } from "../ports/services";

export interface CompleteSessionCommand {
  sessionId: string;
}

export class CompleteSessionCase {
  constructor(
    private readonly sessions: InterviewSessionRepository,
    private readonly clock: Clock
  ) {}

  async execute(command: CompleteSessionCommand) {
    const stored = await this.sessions.getById(command.sessionId);
    if (!stored) throw new Error("SESSION_NOT_FOUND");

    const session = new InterviewSession(stored);
    session.nextOrComplete(this.clock.nowISO());

    await this.sessions.save(session.state);
    return session.state;
  }
}