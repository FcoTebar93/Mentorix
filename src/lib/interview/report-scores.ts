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

export function formatConfidence(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value <= 1) return `${Math.round(value * 100)}%`;
  if (value <= 100) return `${Math.round(value)}%`;
  return String(value);
}
