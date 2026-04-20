import { LlmProvider } from "../application/ports/services";

export interface LlmProviderConfig {
  provider: LlmProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

function asNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadLlmConfig(env: NodeJS.ProcessEnv = process.env): LlmProviderConfig {
  const provider = (env.LLM_PROVIDER ?? "openai") as LlmProvider;

  return {
    provider,
    apiKey: env.LLM_API_KEY,
    baseUrl: env.LLM_BASE_URL,
    model: env.LLM_MODEL ?? "gpt-4o-mini",
    temperature: asNumber(env.LLM_TEMPERATURE, 0.2),
    maxTokens: asNumber(env.LLM_MAX_TOKENS, 700),
    timeoutMs: asNumber(env.LLM_TIMEOUT_MS, 20000),
  };
}