import { performance } from "node:perf_hooks";

type TimingContextValue = string | number | boolean | null | undefined;

export type TimingContext = Record<string, TimingContextValue>;

function roundMs(value: number): number {
  return Math.round(value * 100) / 100;
}

function cleanContext(context: TimingContext): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean | null>;
}

function logTiming(
  event: "start" | "step" | "end" | "error",
  scope: string,
  context: TimingContext,
  details: Record<string, unknown>
): void {
  console.info(
    `[timing] ${JSON.stringify({
      type: "timing",
      scope,
      event,
      ...cleanContext(context),
      ...details,
    })}`
  );
}

export class TimingTrace {
  private readonly startedAt = performance.now();

  constructor(
    private readonly scope: string,
    private readonly context: TimingContext = {}
  ) {
    logTiming("start", this.scope, this.context, { elapsedMs: 0 });
  }

  async step<T>(stage: string, fn: () => Promise<T> | T): Promise<T> {
    const stageStart = performance.now();
    try {
      const result = await fn();
      const stageEnd = performance.now();
      logTiming("step", this.scope, this.context, {
        stage,
        durationMs: roundMs(stageEnd - stageStart),
        elapsedMs: roundMs(stageEnd - this.startedAt),
      });
      return result;
    } catch (error) {
      const stageEnd = performance.now();
      logTiming("error", this.scope, this.context, {
        stage,
        durationMs: roundMs(stageEnd - stageStart),
        elapsedMs: roundMs(stageEnd - this.startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  mark(stage: string, details: Record<string, unknown> = {}): void {
    const now = performance.now();
    logTiming("step", this.scope, this.context, {
      stage,
      elapsedMs: roundMs(now - this.startedAt),
      ...details,
    });
  }

  end(details: Record<string, unknown> = {}): void {
    const endedAt = performance.now();
    logTiming("end", this.scope, this.context, {
      elapsedMs: roundMs(endedAt - this.startedAt),
      ...details,
    });
  }
}
