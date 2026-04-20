import { InterviewSession } from "../../domain/interview/session/session.aggregate";
import { InterviewSessionRepository } from "../ports/repositories";
import { Clock, ILlmService, IdGenerator } from "../ports/services";

export interface EvaluateAnswerCommand {
  sessionId: string;
  rubricDimensions: { key: string; weight: number }[];
}

export class EvaluateAnswerCase {
  constructor(
    private readonly sessions: InterviewSessionRepository,
    private readonly llm: ILlmService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: EvaluateAnswerCommand) {
    const stored = await this.sessions.getById(command.sessionId);
    if (!stored) throw new Error("SESSION_NOT_FOUND");

    if (!command.rubricDimensions.length) {
      throw new Error("RUBRIC_DIMENSIONS_REQUIRED");
    }

    const session = new InterviewSession(stored);
    const lastAnswer = session.state.answers[session.state.answers.length - 1];
    const lastQuestion = session.state.questions[session.state.questions.length - 1];

    if (!lastAnswer || !lastQuestion) throw new Error("QUESTION_OR_ANSWER_MISSING");

    let draft;
    try {
      draft = await this.llm.evaluateAnswer({
        question: lastQuestion.text,
        answer: lastAnswer,
        rubric: { dimensions: command.rubricDimensions },
      });
    } catch {
      throw new Error("LLM_EVALUATION_FAILED");
    }

    session.storeEvaluation({
      id: this.ids.uuid(),
      answerId: lastAnswer.id,
      score: draft.score,
      dimensionScores: draft.dimensionScores,
      strengths: draft.strengths,
      improvements: draft.improvements,
      confidence: draft.confidence,
      evaluatedAt: this.clock.nowISO(),
    });

    await this.sessions.save(session.state);
    return session.state;
  }
}