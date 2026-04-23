import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import type { SubmitAnswerCase } from "./submit.case.js";
import type { EvaluateAnswerCase } from "./evaluate.case.js";
import type { CompleteSessionCase } from "./complete.case.js";

export interface CompleteTurnCommand {
  sessionId: string;
  questionId: string;
  source: "voice" | "text";
  text: string;
  rubricDimensions: { key: string; weight: number }[];
}

export interface CompleteTurnResult {
  session: InterviewSessionProps;
  latestEvaluation: InterviewSessionProps["evaluations"][number] | null;
  latestFeedback: InterviewSessionProps["feedbackItems"][number] | null;
  nextQuestion: InterviewSessionProps["questions"][number] | null;
  isCompleted: boolean;
}

export class CompleteTurnCase {
  constructor(
    private readonly submitAnswer: SubmitAnswerCase,
    private readonly evaluateAnswer: EvaluateAnswerCase,
    private readonly completeSession: CompleteSessionCase
  ) {}

  async execute(command: CompleteTurnCommand): Promise<CompleteTurnResult> {
    await this.submitAnswer.execute({
      sessionId: command.sessionId,
      questionId: command.questionId,
      source: command.source,
      text: command.text,
    });

    await this.evaluateAnswer.execute({
      sessionId: command.sessionId,
      rubricDimensions: command.rubricDimensions,
    });

    const session = await this.completeSession.execute({
      sessionId: command.sessionId,
    });

    const latestEvaluation =
      session.evaluations.length > 0 ? session.evaluations[session.evaluations.length - 1] : null;

    const latestFeedback =
      session.feedbackItems.length > 0
        ? session.feedbackItems[session.feedbackItems.length - 1]
        : null;

    const nextQuestion =
      session.status === "ASKING" && session.questions.length > 0
        ? session.questions[session.questions.length - 1]
        : null;

    return {
      session,
      latestEvaluation,
      latestFeedback,
      nextQuestion,
      isCompleted: session.status === "COMPLETED",
    };
  }
}