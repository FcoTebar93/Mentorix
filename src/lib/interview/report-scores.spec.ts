import { describe, expect, it } from "vitest";
import {
  formatConfidence,
  inferDimensionScoreMultiplier,
  normalizeDimensionScores,
  normalizePercentScale,
  normalizeScoreValue,
  normalizeSessionReport,
  usesTenPointScale,
} from "./report-scores.js";

describe("report-scores", () => {
  it("detects ten-point dimension scale", () => {
    expect(usesTenPointScale([9, 8, 7])).toBe(true);
    expect(usesTenPointScale([70, 80])).toBe(false);
  });

  it("normalizes ten-point values to percent", () => {
    expect(normalizePercentScale(9, true)).toBe(90);
    expect(normalizePercentScale(70, false)).toBe(70);
  });

  it("normalizes mixed scales per value", () => {
    expect(normalizeScoreValue(9)).toBe(90);
    expect(normalizeScoreValue(85)).toBe(85);
    expect(normalizeScoreValue(0.9)).toBe(90);
    expect(normalizeScoreValue(1)).toBe(10);
  });

  it("normalizes dimension blocks with context", () => {
    expect(normalizeDimensionScores({ architecture: 9, communication: 8 })).toEqual({
      architecture: 90,
      communication: 80,
    });
    expect(normalizeDimensionScores({ architecture: 1, communication: 1, problem_solving: 1 })).toEqual({
      architecture: 10,
      communication: 10,
      problem_solving: 10,
    });
    expect(inferDimensionScoreMultiplier([0.9, 0.85])).toBe(100);
  });

  it("formats confidence as percent", () => {
    expect(formatConfidence(0.9)).toBe("90%");
    expect(formatConfidence(null)).toBe("—");
  });

  it("fills missing report fields from partial API payloads", () => {
    const normalized = normalizeSessionReport({
      sessionId: "s1",
      status: "completed",
      overallScore: 75,
      confidenceAverage: 0.8,
      evaluatedAnswers: 2,
      dimensionAverages: { clarity: 8 },
      recommendation: "Avanzar",
    } as unknown as Parameters<typeof normalizeSessionReport>[0]);

    expect(normalized.turns).toEqual([]);
    expect(normalized.strengths).toEqual([]);
    expect(normalized.improvements).toEqual([]);
    expect(normalized.dimensionAverages.clarity).toBe(80);
  });
});
