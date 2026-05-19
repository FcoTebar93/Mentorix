import { describe, expect, it } from "vitest";
import {
  buildSessionReportTurns,
  computeDimensionAverages,
  enrichReportWithSession,
  pickGlobalThemes,
  reconcileSessionQuestions,
} from "./report-builder.js";

describe("report-builder", () => {
  it("prioritizes recurring themes for global strengths", () => {
    const themes = pickGlobalThemes([
      ["Claridad", "Buen ritmo"],
      ["Claridad", "Ejemplos concretos"],
      ["Buen ritmo"],
    ]);
    expect(themes).toContain("Claridad");
    expect(themes).toContain("Buen ritmo");
    expect(themes.indexOf("Ejemplos concretos")).toBeGreaterThan(themes.indexOf("Claridad"));
  });

  it("builds turns aligned with questions and normalizes dimension scores", () => {
    const turns = buildSessionReportTurns({
      id: "s1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Ana" },
      entryPoint: { mode: "shared_link" },
      status: "COMPLETED",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "¿Qué es un API?",
          generatedByModel: "mock",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [
        {
          id: "a1",
          questionId: "q1",
          source: "text",
          text: "Una interfaz para comunicar servicios.",
          receivedAt: new Date().toISOString(),
        },
      ],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 85,
          dimensionScores: { communication: 8 },
          strengths: ["Clara definición"],
          improvements: ["Más detalle técnico"],
          confidence: 0.88,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [
        {
          id: "f1",
          answerId: "a1",
          text: "Buen inicio, amplía con un ejemplo.",
          generatedAt: new Date().toISOString(),
        },
      ],
      version: 1,
    });

    expect(turns).toHaveLength(1);
    expect(turns[0]?.questionText).toContain("API");
    expect(turns[0]?.score).toBe(85);
    expect(turns[0]?.dimensionScores.communication).toBe(80);
    expect(turns[0]?.strengths).toEqual(["Clara definición"]);
  });

  it("reconstructs turns from answers when questions array is empty", () => {
    const questions = reconcileSessionQuestions({
      id: "s1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Ana" },
      entryPoint: { mode: "shared_link" },
      status: "COMPLETED",
      currentQuestionIndex: 0,
      totalQuestions: 1,
      questions: [],
      answers: [
        {
          id: "a1",
          questionId: "q1",
          source: "text",
          text: "Respuesta guardada.",
          questionText: "¿Cómo funciona REST?",
          receivedAt: "2026-01-01T10:00:00.000Z",
        },
      ],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 9,
          dimensionScores: { architecture: 9 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      version: 1,
    });

    expect(questions).toHaveLength(1);
    expect(questions[0]?.text).toContain("REST");

    const turns = buildSessionReportTurns({
      id: "s1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Ana" },
      entryPoint: { mode: "shared_link" },
      status: "COMPLETED",
      currentQuestionIndex: 0,
      totalQuestions: 1,
      questions: [],
      answers: [
        {
          id: "a1",
          questionId: "q1",
          source: "text",
          text: "Respuesta guardada.",
          questionText: "¿Cómo funciona REST?",
          receivedAt: "2026-01-01T10:00:00.000Z",
        },
      ],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 9,
          dimensionScores: { architecture: 9 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      version: 1,
    });

    expect(turns).toHaveLength(1);
    expect(turns[0]?.questionText).toContain("REST");
    expect(turns[0]?.score).toBe(90);
    expect(turns[0]?.dimensionScores.architecture).toBe(90);
  });

  it("computes dimension averages across mixed ten-point evaluations", () => {
    const session = {
      id: "s1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Ana" },
      entryPoint: { mode: "shared_link" },
      status: "COMPLETED",
      currentQuestionIndex: 4,
      totalQuestions: 5,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 90,
          dimensionScores: { architecture: 9, communication: 9, problem_solving: 9 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
        {
          id: "e2",
          answerId: "a2",
          score: 95,
          dimensionScores: { architecture: 1, communication: 1, problem_solving: 1 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
        {
          id: "e3",
          answerId: "a3",
          score: 90,
          dimensionScores: { architecture: 9, communication: 9, problem_solving: 9 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      version: 1,
    };

    expect(computeDimensionAverages(session as import("../../domain/interview/session/types.js").InterviewSessionProps)).toEqual({
      architecture: 63,
      communication: 63,
      problem_solving: 63,
    });
  });

  it("enriches API report with session turns", () => {
    const session = {
      id: "s1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "Ana" },
      entryPoint: { mode: "shared_link" },
      status: "COMPLETED",
      currentQuestionIndex: 0,
      totalQuestions: 1,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "¿Qué es REST?",
          generatedByModel: "mock",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [
        {
          id: "a1",
          questionId: "q1",
          source: "text",
          text: "Un estilo arquitectónico.",
          receivedAt: new Date().toISOString(),
        },
      ],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 90,
          dimensionScores: { architecture: 9 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      version: 1,
    };

    const enriched = enrichReportWithSession(
      {
        sessionId: "s1",
        status: "COMPLETED",
        overallScore: 90,
        evaluatedAnswers: 1,
        strengths: [],
        improvements: [],
        dimensionAverages: {},
        confidenceAverage: 0.9,
        recommendation: "Avanzar",
        turns: [],
      },
      session as import("../../domain/interview/session/types.js").InterviewSessionProps
    );

    expect(enriched.turns).toHaveLength(1);
    expect(enriched.turns[0]?.questionText).toContain("REST");
    expect(enriched.dimensionAverages.architecture).toBe(90);
  });
});
