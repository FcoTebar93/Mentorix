import { describe, expect, it } from "vitest";
import { CompleteSessionCase } from "./complete.case.js";
import { SubmitAnswerCase } from "./submit.case.js";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import {
  InMemoryInterviewSessionRepository,
  InMemoryInterviewTemplateRepository,
} from "../../infrastructure/memory/memory.repository.js";
import { SystemClock, SystemIdGenerator } from "../../infrastructure/system/system.service.js";
import { EvaluateAnswerCase } from "../../application/cases/evaluate.case.js";
import type { EvaluateAnswerInput, GenerateQuestionInput, ILlmService, ILlmServiceFactory, LlmEvaluationDraft } from "../ports/services.js";

describe("Use case flow integration", () => {
  it("submit -> evaluate -> complete with seeded session", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    await templates.save({
      id: "t1",
      ownerUserId: "u1",
      title: "Flow Template",
      role: "Backend Engineer",
      level: "mid",
      language: "es",
      totalQuestions: 1,
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
    const llmFactory: ILlmServiceFactory = {
      forTemplate() {
        return llmStub;
      },
    };

    const submitCase = new SubmitAnswerCase(sessions, ids, clock);
    const evaluateCase = new EvaluateAnswerCase(sessions, templates, llmFactory, ids, clock);
    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

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

  it("complete uses fallback provider when primary generateQuestion fails", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();
  
    await templates.save({
      id: "t-fallback-1",
      ownerUserId: "u1",
      title: "Fallback Template",
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
  
    let primaryCalls = 0;
    let fallbackCalls = 0;
  
    const primaryService: ILlmService = {
      async generateQuestion(_input: GenerateQuestionInput): Promise<{ text: string }> {
        primaryCalls += 1;
        throw new Error("primary down");
      },
      async evaluateAnswer(_input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
        return {
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["ok"],
          improvements: ["more depth"],
          confidence: 0.9,
        };
      },
    };
  
    const fallbackService: ILlmService = {
      async generateQuestion(_input: GenerateQuestionInput): Promise<{ text: string }> {
        fallbackCalls += 1;
        return { text: "fallback question" };
      },
      async evaluateAnswer(_input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
        return {
          score: 82,
          dimensionScores: { architecture: 82 },
          strengths: ["good"],
          improvements: ["add examples"],
          confidence: 0.9,
        };
      },
    };
  
    const llmFactory: ILlmServiceFactory = {
      forTemplate() {
        return primaryService;
      },
      forTemplateWithFallback() {
        const chained: ILlmService = {
          async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string }> {
            try {
              return await primaryService.generateQuestion(input);
            } catch {
              return fallbackService.generateQuestion(input);
            }
          },
          async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
            try {
              return await primaryService.evaluateAnswer(input);
            } catch {
              return fallbackService.evaluateAnswer(input);
            }
          },
        };
        return chained;
      },
    };
  
    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);
  
    const seeded: InterviewSessionProps = {
      id: "s-fallback-1",
      templateId: "t-fallback-1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Fran" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "FEEDBACKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "Question 1",
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
  
    const completed = await completeCase.execute({ sessionId: "s-fallback-1" });
  
    expect(completed.status).toBe("ASKING");
    expect(completed.questions).toHaveLength(2);
    expect(completed.questions[1].text).toBe("fallback question");
    expect(primaryCalls).toBe(1);
    expect(fallbackCalls).toBe(1);
  });

  it("propagates dynamic prompt to question generation", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    const expectedPrompt = "Haz foco en razonamiento arquitectonico y decisiones tecnicas.";

    await templates.save({
      id: "t-prompt-1",
      ownerUserId: "u1",
      templateType: "dynamic",
      title: "Prompt Template",
      role: "Backend Engineer",
      level: "mid",
      language: "es",
      totalQuestions: 2,
      prompt: expectedPrompt,
      questions: [],
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

    let capturedPrompt: string | undefined;
    const llmStub: ILlmService = {
      async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string }> {
        capturedPrompt = input.prompt;
        return { text: "generated with prompt" };
      },
      async evaluateAnswer(_input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
        return {
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["ok"],
          improvements: ["more depth"],
          confidence: 0.9,
        };
      },
    };

    const llmFactory: ILlmServiceFactory = {
      forTemplate() {
        return llmStub;
      },
      forTemplateWithFallback() {
        return llmStub;
      },
    };

    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

    const seeded: InterviewSessionProps = {
      id: "s-prompt-1",
      templateId: "t-prompt-1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Fran" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "FEEDBACKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "Pregunta inicial",
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

    const completed = await completeCase.execute({ sessionId: "s-prompt-1" });

    expect(completed.status).toBe("ASKING");
    expect(capturedPrompt).toBe(expectedPrompt);
    expect(completed.questions[1].text).toBe("generated with prompt");
  });
});