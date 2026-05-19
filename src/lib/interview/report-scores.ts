import type { SessionReport, SessionReportTurn } from "./types.js";

export function usesTenPointScale(values: number[]): boolean {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return false;
  return Math.max(...finite) <= 10;
}

export function normalizePercentScale(value: number, fromTenPointScale: boolean): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = fromTenPointScale ? value * 10 : value;
  return Math.min(100, Math.max(0, Math.round(scaled)));
}

/** Infiere el multiplicador para un bloque de dimensiones de una misma evaluación. */
export function inferDimensionScoreMultiplier(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return 1;
  const max = Math.max(...finite);
  const hasFraction = finite.some((value) => !Number.isInteger(value));
  if (max <= 1 && hasFraction) return 100;
  if (max <= 10) return 10;
  return 1;
}

export function normalizeDimensionScores(dimensionScores: Record<string, number>): Record<string, number> {
  const values = Object.values(dimensionScores).filter((value) => Number.isFinite(value));
  const multiplier = inferDimensionScoreMultiplier(values);
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(dimensionScores)) {
    if (!Number.isFinite(value)) continue;
    result[key] = Math.min(100, Math.max(0, Math.round(value * multiplier)));
  }
  return result;
}

/** Normaliza una nota individual sin contexto (promedios ya agregados en 0–100). */
export function normalizeScoreValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > 0 && value <= 1 && !Number.isInteger(value)) {
    return Math.min(100, Math.max(0, Math.round(value * 100)));
  }
  if (value <= 10) return Math.min(100, Math.max(0, Math.round(value * 10)));
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatConfidence(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value <= 1) return `${Math.round(value * 100)}%`;
  if (value <= 100) return `${Math.round(value)}%`;
  return String(value);
}

function normalizeTurn(turn: SessionReportTurn): SessionReportTurn {
  const dimensionScores: Record<string, number> = {};
  for (const [key, value] of Object.entries(turn.dimensionScores ?? {})) {
    if (!Number.isFinite(value)) continue;
    dimensionScores[key] = value <= 100 && value > 10 ? Math.round(value) : normalizeScoreValue(value);
  }

  return {
    ...turn,
    score:
      turn.score !== null && Number.isFinite(turn.score)
        ? turn.score <= 100 && turn.score > 10
          ? Math.round(turn.score)
          : normalizeScoreValue(turn.score)
        : null,
    dimensionScores,
    strengths: turn.strengths ?? [],
    improvements: turn.improvements ?? [],
  };
}

/** Asegura campos obligatorios cuando el API devuelve un reporte parcial o antiguo. */
export function normalizeSessionReport(data: SessionReport): SessionReport {
  const dimensionAverages: Record<string, number> = {};
  for (const [key, value] of Object.entries(data.dimensionAverages ?? {})) {
    if (!Number.isFinite(value)) continue;
    dimensionAverages[key] =
      value > 10 && value <= 100 ? Math.round(value) : normalizeScoreValue(value);
  }

  return {
    ...data,
    overallScore:
      data.overallScore !== null && Number.isFinite(data.overallScore)
        ? data.overallScore > 10 && data.overallScore <= 100
          ? Math.round(data.overallScore)
          : normalizeScoreValue(data.overallScore)
        : null,
    strengths: data.strengths ?? [],
    improvements: data.improvements ?? [],
    dimensionAverages,
    recommendation: data.recommendation ?? "",
    turns: (data.turns ?? []).map(normalizeTurn),
  };
}
