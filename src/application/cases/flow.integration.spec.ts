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

  it("complete normalizes generic LLM failures to LLM_QUESTION_GENERATION_FAILED", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    await templates.save({
      id: "t-llm-error-1",
      ownerUserId: "u1",
      title: "LLM Error Template",
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

    const failingService: ILlmService = {
      async generateQuestion(_input: GenerateQuestionInput): Promise<{ text: string }> {
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

    const llmFactory: ILlmServiceFactory = {
      forTemplate() {
        return failingService;
      },
    };

    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

    const seeded: InterviewSessionProps = {
      id: "s-llm-error-1",
      templateId: "t-llm-error-1",
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

    await expect(completeCase.execute({ sessionId: "s-llm-error-1" })).rejects.toThrow(
      "LLM_QUESTION_GENERATION_FAILED"
    );
  });

  it("complete propagates LLM_* errors raised by the provider", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    await templates.save({
      id: "t-llm-error-2",
      ownerUserId: "u1",
      title: "LLM Error Template 2",
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

    const failingService: ILlmService = {
      async generateQuestion(_input: GenerateQuestionInput): Promise<{ text: string }> {
        throw new Error("LLM_RATE_LIMITED");
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
        return failingService;
      },
    };

    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

    const seeded: InterviewSessionProps = {
      id: "s-llm-error-2",
      templateId: "t-llm-error-2",
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

    await expect(completeCase.execute({ sessionId: "s-llm-error-2" })).rejects.toThrow(
      "LLM_RATE_LIMITED"
    );
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

  it("regenerates when the provider returns an exact repeated question", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    await templates.save({
      id: "t-repeat-exact-1",
      ownerUserId: "u1",
      templateType: "dynamic",
      title: "Repeat Protection",
      role: "Backend Engineer",
      level: "mid",
      language: "es",
      totalQuestions: 3,
      prompt: "Evita solapamientos de tema.",
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

    const rejectedSnapshots: string[][] = [];
    let generationCallCount = 0;
    const llmStub: ILlmService = {
      async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string }> {
        generationCallCount += 1;
        rejectedSnapshots.push([...(input.rejectedQuestions ?? [])]);
        return generationCallCount === 1
          ? { text: "Pregunta inicial" }
          : { text: "¿Como diseñarias la invalidacion de sesiones en varios nodos?" };
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
    };

    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

    await sessions.save({
      id: "s-repeat-exact-1",
      templateId: "t-repeat-exact-1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Fran" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "FEEDBACKING",
      currentQuestionIndex: 1,
      totalQuestions: 3,
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
    });

    const completed = await completeCase.execute({ sessionId: "s-repeat-exact-1" });

    expect(generationCallCount).toBe(2);
    expect(rejectedSnapshots[0]).toEqual([]);
    expect(rejectedSnapshots[1]).toEqual(["Pregunta inicial"]);
    expect(completed.questions[1].text).toBe(
      "¿Como diseñarias la invalidacion de sesiones en varios nodos?"
    );
  });

  it("regenerates when a semantically similar question is flagged by the LLM", async () => {
    const sessions = new InMemoryInterviewSessionRepository();
    const templates = new InMemoryInterviewTemplateRepository();
    const ids = new SystemIdGenerator();
    const clock = new SystemClock();

    await templates.save({
      id: "t-repeat-semantic-1",
      ownerUserId: "u1",
      templateType: "dynamic",
      title: "Semantic Repeat Protection",
      role: "Backend Engineer",
      level: "mid",
      language: "es",
      totalQuestions: 3,
      prompt: "Haz preguntas claramente distintas.",
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

    const rejectedSnapshots: string[][] = [];
    const semanticCandidates = [
      "¿Como evitarias condiciones de carrera durante el login bajo alta carga?",
      "¿Como diseñarias la revocacion de tokens entre varios nodos?",
    ];
    let generationIndex = 0;
    const llmStub: ILlmService = {
      async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string }> {
        rejectedSnapshots.push([...(input.rejectedQuestions ?? [])]);
        const text = semanticCandidates[generationIndex] ?? semanticCandidates[semanticCandidates.length - 1];
        generationIndex += 1;
        return { text };
      },
      async judgeQuestionSimilarity(input) {
        if (input.candidateQuestion.includes("condiciones de carrera")) {
          return {
            isTooSimilar: true,
            matchedQuestion:
              "¿Como manejarias la concurrencia en el sistema de autenticacion para evitar bloqueos y mejorar el rendimiento?",
            reason: "same_core_topic",
            overlapScore: 0.92,
          };
        }

        return { isTooSimilar: false, overlapScore: 0.18 };
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
    };

    const completeCase = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);

    await sessions.save({
      id: "s-repeat-semantic-1",
      templateId: "t-repeat-semantic-1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Fran" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "FEEDBACKING",
      currentQuestionIndex: 1,
      totalQuestions: 3,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "¿Como manejarias la concurrencia en el sistema de autenticacion para evitar bloqueos y mejorar el rendimiento?",
          generatedByModel: "manual",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    });

    const completed = await completeCase.execute({ sessionId: "s-repeat-semantic-1" });

    expect(rejectedSnapshots[0]).toEqual([]);
    expect(rejectedSnapshots[1]).toEqual([
      "¿Como evitarias condiciones de carrera durante el login bajo alta carga?",
    ]);
    expect(completed.questions[1].text).toBe(
      "¿Como diseñarias la revocacion de tokens entre varios nodos?"
    );
  });
});