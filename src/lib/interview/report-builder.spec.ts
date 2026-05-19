import { describe, expect, it } from "vitest";
import { buildSessionReportTurns, pickGlobalThemes } from "./report-builder.js";

describe("report-builder", () => {
  it("prioritizes recurring themes for global strengths", () => {
    const themes = pickGlobalThemes([
      ["Claridad", "Buen ritmo"],
      ["Claridad", "Ejemplos concretos"],
      ["Buen ritmo"],
    ]);
    expect(themes[0]).toBe("Claridad");
    expect(themes).toContain("Buen ritmo");
  });

  it("builds turns aligned with questions", () => {
    const turns = buildSessionReportTurns(
      {
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
      },
      true
    );

    expect(turns).toHaveLength(1);
    expect(turns[0]?.questionText).toContain("API");
    expect(turns[0]?.score).toBe(85);
    expect(turns[0]?.dimensionScores.communication).toBe(80);
    expect(turns[0]?.strengths).toEqual(["Clara definición"]);
  });
});
