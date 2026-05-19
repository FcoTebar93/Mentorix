import { describe, expect, it } from "vitest";
import { formatConfidence, normalizePercentScale, usesTenPointScale } from "./report-scores.js";

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
});
