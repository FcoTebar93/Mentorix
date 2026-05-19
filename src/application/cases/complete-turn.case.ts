import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import type { InterviewSessionRepository } from "../ports/repositories.js";
import type { SubmitAnswerCase } from "./submit.case.js";
import type { EvaluateAnswerCase } from "./evaluate.case.js";
import type { CompleteSessionCase } from "./complete.case.js";
import { TimingTrace } from "../../lib/observability/timing.js";

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
    private readonly sessions: InterviewSessionRepository,
    private readonly submitAnswer: SubmitAnswerCase,
    private readonly evaluateAnswer: EvaluateAnswerCase,
    private readonly completeSession: CompleteSessionCase
  ) {}

  async execute(command: CompleteTurnCommand): Promise<CompleteTurnResult> {
    const trace = new TimingTrace("complete_turn", {
      sessionId: command.sessionId,
      questionId: command.questionId,
      source: command.source,
      rubricDimensions: command.rubricDimensions.length,
    });

    try {
      const current = await trace.step("load_session", () => this.sessions.getById(command.sessionId));
      if (!current) throw new Error("SESSION_NOT_FOUND");

      if (current.status === "COMPLETED") {
        const result = this.buildResult(current);
        trace.end({ status: current.status, shortCircuit: true });
        return result;
      }
      if (current.status === "CANCELLED" || current.status === "FAILED") {
        throw new Error("SESSION_ALREADY_TERMINATED");
      }

      const lastAnswerForQuestion = this.findLastAnswerForQuestion(current, command.questionId);

      if (current.status === "ASKING") {
        await trace.step("submit_answer", () =>
          this.submitAnswer.execute({
            sessionId: command.sessionId,
            questionId: command.questionId,
            source: command.source,
            text: command.text,
          })
        );
      } else if (current.status === "EVALUATING" || current.status === "FEEDBACKING") {
        this.assertResumeForSameTurn(current, command, lastAnswerForQuestion);
      }

      const afterSubmit = await trace.step("reload_session", () =>
        this.sessions.getById(command.sessionId)
      );
      if (!afterSubmit) throw new Error("SESSION_NOT_FOUND");

      const evaluationExists = this.hasEvaluationForLastAnswer(afterSubmit);
      const shouldEvaluate =
        afterSubmit.status === "EVALUATING" && !evaluationExists;
      if (shouldEvaluate) {
        await trace.step("evaluate_answer", () =>
          this.evaluateAnswer.execute({
            sessionId: command.sessionId,
            rubricDimensions: command.rubricDimensions,
          })
        );
      }

      const session = await trace.step("complete_session", () =>
        this.completeSession.execute({
          sessionId: command.sessionId,
        })
      );

      const result = this.buildResult(session);
      trace.end({
        status: session.status,
        isCompleted: result.isCompleted,
        nextQuestionGenerated: Boolean(result.nextQuestion),
      });

      return result;
    } catch (error) {
      trace.end({ failed: true, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private buildResult(session: InterviewSessionProps): CompleteTurnResult {
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

  private findLastAnswerForQuestion(
    session: InterviewSessionProps,
    questionId: string
  ): InterviewSessionProps["answers"][number] | null {
    for (let i = session.answers.length - 1; i >= 0; i -= 1) {
      if (session.answers[i].questionId === questionId) {
        return session.answers[i];
      }
    }
    return null;
  }

  private hasEvaluationForLastAnswer(session: InterviewSessionProps): boolean {
    const lastAnswer = session.answers[session.answers.length - 1];
    if (!lastAnswer) return false;
    return session.evaluations.some((evaluation) => evaluation.answerId === lastAnswer.id);
  }

  private assertResumeForSameTurn(
    session: InterviewSessionProps,
    command: CompleteTurnCommand,
    lastAnswerForQuestion: InterviewSessionProps["answers"][number] | null
  ): void {
    const lastAnswer = session.answers[session.answers.length - 1];
    if (!lastAnswer) {
      throw new Error("TURN_RESUME_INVALID_STATE");
    }
    if (lastAnswer.questionId !== command.questionId) {
      throw new Error("TURN_RESUME_QUESTION_MISMATCH");
    }
    if (!lastAnswerForQuestion) {
      throw new Error("TURN_RESUME_ANSWER_NOT_FOUND");
    }
  }
}
