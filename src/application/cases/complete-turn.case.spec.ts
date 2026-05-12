import { describe, expect, it, vi } from "vitest";
import type {
  InterviewSessionProps,
  InterviewSessionStatus,
  SessionAnswer,
  SessionEvaluation,
  SessionFeedback,
  SessionQuestion,
} from "../../domain/interview/session/types.js";
import {
  InMemoryInterviewSessionRepository,
  InMemoryInterviewTemplateRepository,
} from "../../infrastructure/memory/memory.repository.js";
import { SystemClock, SystemIdGenerator } from "../../infrastructure/system/system.service.js";
import { CompleteTurnCase } from "./complete-turn.case.js";
import { CompleteSessionCase } from "./complete.case.js";
import { EvaluateAnswerCase } from "./evaluate.case.js";
import { SubmitAnswerCase } from "./submit.case.js";
import type {
  EvaluateAnswerInput,
  GenerateQuestionInput,
  ILlmService,
  ILlmServiceFactory,
  LlmEvaluationDraft,
} from "../ports/services.js";

type Wiring = ReturnType<typeof buildCompleteTurnCase>;

const RUBRIC = [{ key: "architecture", weight: 1 }];

describe("CompleteTurnCase idempotency", () => {
  it("runs full submit + evaluate + complete when session is ASKING", async () => {
    const wiring = buildCompleteTurnCase();
    await seedTemplate(wiring);
    await wiring.sessions.save(buildSession("ASKING"));

    const result = await wiring.completeTurn.execute({
      sessionId: "s-1",
      questionId: "q1",
      source: "text",
      text: "Answer for q1",
      rubricDimensions: RUBRIC,
    });

    expect(wiring.submitSpy).toHaveBeenCalledTimes(1);
    expect(wiring.evaluateSpy).toHaveBeenCalledTimes(1);
    expect(wiring.completeSpy).toHaveBeenCalledTimes(1);

    expect(result.isCompleted).toBe(false);
    expect(result.nextQuestion?.text).toBe("next-question");
    expect(result.latestEvaluation?.score).toBe(85);
    expect(result.session.status).toBe("ASKING");
    expect(result.session.answers).toHaveLength(1);
    expect(result.session.evaluations).toHaveLength(1);
  });

  it("skips submit when session is EVALUATING and last answer matches", async () => {
    const wiring = buildCompleteTurnCase();
    await seedTemplate(wiring);
    const session = buildSession("EVALUATING", {
      answers: [buildAnswer({ questionId: "q1", text: "previously submitted" })],
    });
    await wiring.sessions.save(session);

    const result = await wiring.completeTurn.execute({
      sessionId: "s-1",
      questionId: "q1",
      source: "text",
      text: "ignored by case because answer already exists",
      rubricDimensions: RUBRIC,
    });

    expect(wiring.submitSpy).not.toHaveBeenCalled();
    expect(wiring.evaluateSpy).toHaveBeenCalledTimes(1);
    expect(wiring.completeSpy).toHaveBeenCalledTimes(1);
    expect(result.session.answers).toHaveLength(1);
    expect(result.session.answers[0]!.text).toBe("previously submitted");
    expect(result.session.evaluations).toHaveLength(1);
    expect(result.nextQuestion?.text).toBe("next-question");
  });

  it("skips submit + evaluate when session is FEEDBACKING with prior evaluation", async () => {
    const wiring = buildCompleteTurnCase();
    await seedTemplate(wiring);
    const answer = buildAnswer({ questionId: "q1", text: "earlier answer" });
    const session = buildSession("FEEDBACKING", {
      answers: [answer],
      evaluations: [buildEvaluation({ answerId: answer.id, score: 70 })],
      feedbackItems: [buildFeedback({ answerId: answer.id })],
    });
    await wiring.sessions.save(session);

    const result = await wiring.completeTurn.execute({
      sessionId: "s-1",
      questionId: "q1",
      source: "text",
      text: "ignored",
      rubricDimensions: RUBRIC,
    });

    expect(wiring.submitSpy).not.toHaveBeenCalled();
    expect(wiring.evaluateSpy).not.toHaveBeenCalled();
    expect(wiring.completeSpy).toHaveBeenCalledTimes(1);
    expect(result.session.answers).toHaveLength(1);
    expect(result.session.evaluations).toHaveLength(1);
    expect(result.session.evaluations[0]!.score).toBe(70);
    expect(result.nextQuestion?.text).toBe("next-question");
  });

  it("returns COMPLETED session without running submit/evaluate/complete", async () => {
    const wiring = buildCompleteTurnCase();
    await seedTemplate(wiring);
    const answer = buildAnswer({ questionId: "q1", text: "completed answer" });
    const session = buildSession("COMPLETED", {
      currentQuestionIndex: 1,
      totalQuestions: 1,
      answers: [answer],
      evaluations: [buildEvaluation({ answerId: answer.id })],
      feedbackItems: [buildFeedback({ answerId: answer.id })],
      endedAt: new Date().toISOString(),
    });
    await wiring.sessions.save(session);

    const result = await wiring.completeTurn.execute({
      sessionId: "s-1",
      questionId: "q1",
      source: "text",
      text: "should be ignored",
      rubricDimensions: RUBRIC,
    });

    expect(wiring.submitSpy).not.toHaveBeenCalled();
    expect(wiring.evaluateSpy).not.toHaveBeenCalled();
    expect(wiring.completeSpy).not.toHaveBeenCalled();
    expect(result.isCompleted).toBe(true);
    expect(result.session.status).toBe("COMPLETED");
    expect(result.nextQuestion).toBeNull();
  });

  it.each(["CANCELLED", "FAILED"] as const)(
    "throws SESSION_ALREADY_TERMINATED when session is %s",
    async (status) => {
      const wiring = buildCompleteTurnCase();
      await seedTemplate(wiring);
      const answer = buildAnswer({ questionId: "q1", text: "answer" });
      const session = buildSession(status, {
        answers: [answer],
        endedAt: new Date().toISOString(),
      });
      await wiring.sessions.save(session);

      await expect(
        wiring.completeTurn.execute({
          sessionId: "s-1",
          questionId: "q1",
          source: "text",
          text: "irrelevant",
          rubricDimensions: RUBRIC,
        })
      ).rejects.toThrow("SESSION_ALREADY_TERMINATED");

      expect(wiring.submitSpy).not.toHaveBeenCalled();
      expect(wiring.evaluateSpy).not.toHaveBeenCalled();
      expect(wiring.completeSpy).not.toHaveBeenCalled();
    }
  );

  it("rejects resume when questionId does not match the last stored answer", async () => {
    const wiring = buildCompleteTurnCase();
    await seedTemplate(wiring);
    const session = buildSession("FEEDBACKING", {
      answers: [buildAnswer({ questionId: "q1", text: "answer for q1" })],
      evaluations: [],
    });
    await wiring.sessions.save(session);

    await expect(
      wiring.completeTurn.execute({
        sessionId: "s-1",
        questionId: "q-other",
        source: "text",
        text: "trying to resume a different question",
        rubricDimensions: RUBRIC,
      })
    ).rejects.toThrow("TURN_RESUME_QUESTION_MISMATCH");

    expect(wiring.submitSpy).not.toHaveBeenCalled();
    expect(wiring.evaluateSpy).not.toHaveBeenCalled();
    expect(wiring.completeSpy).not.toHaveBeenCalled();
  });

  it("throws SESSION_NOT_FOUND when the session id does not exist", async () => {
    const wiring = buildCompleteTurnCase();

    await expect(
      wiring.completeTurn.execute({
        sessionId: "nonexistent",
        questionId: "q1",
        source: "text",
        text: "something",
        rubricDimensions: RUBRIC,
      })
    ).rejects.toThrow("SESSION_NOT_FOUND");

    expect(wiring.submitSpy).not.toHaveBeenCalled();
    expect(wiring.evaluateSpy).not.toHaveBeenCalled();
    expect(wiring.completeSpy).not.toHaveBeenCalled();
  });
});

function buildCompleteTurnCase() {
  const sessions = new InMemoryInterviewSessionRepository();
  const templates = new InMemoryInterviewTemplateRepository();
  const ids = new SystemIdGenerator();
  const clock = new SystemClock();

  const llmStub: ILlmService = {
    async generateQuestion(_input: GenerateQuestionInput): Promise<{ text: string }> {
      return { text: "next-question" };
    },
    async evaluateAnswer(_input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
      return {
        score: 85,
        dimensionScores: { architecture: 85 },
        strengths: ["clear"],
        improvements: ["more depth"],
        confidence: 0.9,
      };
    },
  };
  const llmFactory: ILlmServiceFactory = {
    forTemplate: () => llmStub,
    forTemplateWithFallback: () => llmStub,
  };

  const submit = new SubmitAnswerCase(sessions, ids, clock);
  const evaluate = new EvaluateAnswerCase(sessions, templates, llmFactory, ids, clock);
  const complete = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

  const submitSpy = vi.spyOn(submit, "execute");
  const evaluateSpy = vi.spyOn(evaluate, "execute");
  const completeSpy = vi.spyOn(complete, "execute");

  const completeTurn = new CompleteTurnCase(sessions, submit, evaluate, complete);

  return {
    sessions,
    templates,
    completeTurn,
    submitSpy,
    evaluateSpy,
    completeSpy,
  };
}

async function seedTemplate(wiring: Wiring): Promise<void> {
  await wiring.templates.save({
    id: "t-1",
    ownerUserId: "u1",
    title: "Template",
    role: "Backend Engineer",
    level: "mid",
    language: "es",
    totalQuestions: 2,
    rubric: {
      dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
      passThreshold: 70,
    },
    llmConfig: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.2,
      maxTokensPerTurn: 600,
    },
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function buildSession(
  status: InterviewSessionStatus,
  overrides: Partial<InterviewSessionProps> = {}
): InterviewSessionProps {
  const now = new Date().toISOString();
  const question: SessionQuestion = {
    id: "q1",
    index: 1,
    text: "Question 1",
    generatedByModel: "manual",
    createdAt: now,
  };

  return {
    id: "s-1",
    templateId: "t-1",
    ownerUserId: "u1",
    participant: { type: "guest", guestAlias: "Fran" },
    entryPoint: { mode: "shared_link", accessLinkId: "l1" },
    status,
    currentQuestionIndex: 0,
    totalQuestions: 2,
    questions: [question],
    answers: [],
    evaluations: [],
    feedbackItems: [],
    startedAt: now,
    version: 1,
    ...overrides,
  };
}

function buildAnswer(overrides: Partial<SessionAnswer> = {}): SessionAnswer {
  return {
    id: overrides.id ?? `a-${Math.random().toString(36).slice(2, 8)}`,
    questionId: overrides.questionId ?? "q1",
    source: overrides.source ?? "text",
    text: overrides.text ?? "answer",
    receivedAt: overrides.receivedAt ?? new Date().toISOString(),
  };
}

function buildEvaluation(overrides: Partial<SessionEvaluation> = {}): SessionEvaluation {
  return {
    id: overrides.id ?? `e-${Math.random().toString(36).slice(2, 8)}`,
    answerId: overrides.answerId ?? "a-unknown",
    score: overrides.score ?? 80,
    dimensionScores: overrides.dimensionScores ?? { architecture: 80 },
    strengths: overrides.strengths ?? ["ok"],
    improvements: overrides.improvements ?? ["depth"],
    confidence: overrides.confidence ?? 0.85,
    evaluatedAt: overrides.evaluatedAt ?? new Date().toISOString(),
  };
}

function buildFeedback(overrides: Partial<SessionFeedback> = {}): SessionFeedback {
  return {
    id: overrides.id ?? `f-${Math.random().toString(36).slice(2, 8)}`,
    answerId: overrides.answerId ?? "a-unknown",
    text: overrides.text ?? "Buen trabajo.",
    generatedAt: overrides.generatedAt ?? new Date().toISOString(),
  };
}
