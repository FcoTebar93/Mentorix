import { describe, expect, it } from "vitest";
import { CompleteSessionCase } from "./complete.case.js";
import { EvaluateAnswerCase } from "./evaluate.case.js";
import { SubmitAnswerCase } from "./submit.case.js";
import type { ILlmService } from "../ports/services.js";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import { InMemoryInterviewSessionRepository } from "../../infrastructure/memory/memory.repositories.js";
import { SystemClock, SystemIdGenerator } from "../../infrastructure/system/system.service.js";

describe("Use case flow integration", () => {
  it("submit -> evaluate -> complete with seeded session", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    const llmStub = {
        async generateQuestion() {
          return { text: "stub question" };
        },
        async evaluateAnswer() {
          return {
            score: 85,
            dimensionScores: { architecture: 85 },
            strengths: ["clear structure"],
            improvements: ["more depth"],
            confidence: 0.9,
          };
        },
    };

    const submitCase = new SubmitAnswerCase(sessions, ids, clock);
    const evaluateCase = new EvaluateAnswerCase(sessions, llmStub, ids, clock);
    const completeCase = new CompleteSessionCase(sessions, clock);

    const seeded: InterviewSessionProps = {
      id: "s-flow-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Fran" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "Explain dependency inversion with an example.",
          generatedByModel: "manual",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    };

    await sessions.save(seeded);

    const submitted = await submitCase.execute({
      sessionId: "s-flow-1",
      questionId: "q1",
      source: "text",
      text: "High-level modules should depend on abstractions.",
    });

    expect(submitted.status).toBe("EVALUATING");

    const evaluated = await evaluateCase.execute({
      sessionId: "s-flow-1",
      rubricDimensions: [{ key: "architecture", weight: 1 }],
    });

    expect(evaluated.status).toBe("FEEDBACKING");
    expect(evaluated.evaluations).toHaveLength(1);

    const completed = await completeCase.execute({
      sessionId: "s-flow-1",
    });

    expect(completed.status).toBe("COMPLETED");
  });
});