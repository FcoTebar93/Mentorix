import { describe, expect, it } from "vitest";
import {
  formatConfidence,
  normalizePercentScale,
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
  });
});
