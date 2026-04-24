import type { LlmInterviewConfig } from "../../domain/interview/template/types.js";
import type { ILlmService, ILlmServiceFactory, LlmProvider } from "../../application/ports/services.js";
import type { LlmProviderConfig } from "../config.llm.js";
import { createLlmService } from "./providers/factory.js";

type FactoryEnv = NodeJS.ProcessEnv;

const SUPPORTED_PROVIDERS: ReadonlySet<LlmProvider> = new Set([
  "openai",
  "anthropic",
  "google",
  "azure",
  "ollama",
  "custom",
  "mock",
]);

function asNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickFirst(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

function normalizeProvider(provider: string): LlmProvider {
  const value = provider.toLowerCase() as LlmProvider;
  if (!SUPPORTED_PROVIDERS.has(value)) {
    throw new Error(`UNSUPPORTED_LLM_PROVIDER: ${provider}`);
  }
  return value;
}

export class EnvLlmServiceFactory implements ILlmServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forTemplate(config: LlmInterviewConfig): ILlmService {
    const provider = normalizeProvider(config.provider);

    const resolved: LlmProviderConfig = {
      provider,
      apiKey: this.resolveApiKey(provider),
      baseUrl: this.resolveBaseUrl(provider),
      model: config.model || this.env.LLM_MODEL || "gpt-4o-mini",
      temperature: Number.isFinite(config.temperature)
        ? config.temperature
        : asNumber(this.env.LLM_TEMPERATURE, 0.2),
      maxTokens: Number.isFinite(config.maxTokensPerTurn)
        ? config.maxTokensPerTurn
        : asNumber(this.env.LLM_MAX_TOKENS, 700),
      timeoutMs: asNumber(this.env.LLM_TIMEOUT_MS, 20000),
    };

    return createLlmService(resolved);
  }

  private resolveApiKey(provider: LlmProvider): string | undefined {
    switch (provider) {
      case "openai":
        return pickFirst(this.env.OPENAI_API_KEY, this.env.LLM_API_KEY);
      case "anthropic":
        return pickFirst(this.env.ANTHROPIC_API_KEY, this.env.LLM_API_KEY);
      case "google":
        return pickFirst(this.env.GOOGLE_API_KEY, this.env.GEMINI_API_KEY, this.env.LLM_API_KEY);
      case "custom":
        return pickFirst(this.env.CUSTOM_LLM_API_KEY, this.env.LLM_API_KEY);
      default:
        return this.env.LLM_API_KEY;
    }
  }

  private resolveBaseUrl(provider: LlmProvider): string | undefined {
    switch (provider) {
      case "openai":
        return pickFirst(this.env.OPENAI_BASE_URL, this.env.LLM_BASE_URL);
      case "anthropic":
        return pickFirst(this.env.ANTHROPIC_BASE_URL, this.env.LLM_BASE_URL);
      case "google":
        return pickFirst(this.env.GOOGLE_BASE_URL, this.env.GEMINI_BASE_URL, this.env.LLM_BASE_URL);
      case "ollama":
        return pickFirst(this.env.OLLAMA_BASE_URL, this.env.LLM_BASE_URL);
      case "custom":
        return pickFirst(this.env.CUSTOM_LLM_BASE_URL, this.env.LLM_BASE_URL);
      default:
        return this.env.LLM_BASE_URL;
    }
  }
}
