import type { LlmInterviewConfig } from "../../domain/interview/template/types.js";
import type {
  ILlmService,
  ILlmServiceFactory,
  LlmProvider,
  GenerateQuestionInput,
  EvaluateAnswerInput,
  LlmEvaluationDraft,
  LlmUsage,
} from "../../application/ports/services.js";
import type { LlmProviderConfig } from "../config.llm.js";
import { createLlmService } from "./providers/factory.js";

type FactoryEnv = NodeJS.ProcessEnv;

const SUPPORTED_PROVIDERS: ReadonlySet<LlmProvider> = new Set([
  "openai",
  "groq",
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

class FallbackLlmService implements ILlmService {
  constructor(
    private readonly servicesInOrder: Array<{ provider: LlmProvider; service: ILlmService }>
  ) {}

  async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
    let lastError: unknown;
    for (const item of this.servicesInOrder) {
      try {
        return await item.service.generateQuestion(input);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("LLM_QUESTION_GENERATION_FAILED");
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
    let lastError: unknown;
    for (const item of this.servicesInOrder) {
      try {
        return await item.service.evaluateAnswer(input);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError ?? new Error("LLM_EVALUATION_FAILED");
  }
}

export class EnvLlmServiceFactory implements ILlmServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forTemplate(config: LlmInterviewConfig): ILlmService {
    const provider = normalizeProvider(config.provider);
    const resolved = this.buildConfigForProvider(config, provider);
    return createLlmService(resolved);
  }

  forTemplateWithFallback(config: LlmInterviewConfig, fallbackProviders: LlmProvider[]): ILlmService {
    const primary = normalizeProvider(config.provider);
    const chain = [primary, ...fallbackProviders]
      .map((p) => normalizeProvider(p))
      .filter((provider, idx, arr) => arr.indexOf(provider) === idx);

    const servicesInOrder = chain.map((provider) => ({
      provider,
      service: createLlmService(this.buildConfigForProvider(config, provider)),
    }));

    return new FallbackLlmService(servicesInOrder);
  }

  private buildConfigForProvider(config: LlmInterviewConfig, provider: LlmProvider): LlmProviderConfig {
    const resolvedProvider = provider === "groq" ? "groq" : provider;
    const fallbackModel =
      resolvedProvider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
    return {
      provider: resolvedProvider,
      apiKey: this.resolveApiKey(resolvedProvider),
      baseUrl: this.resolveBaseUrl(resolvedProvider),
      model: config.model || this.env.LLM_MODEL || fallbackModel,
      temperature: Number.isFinite(config.temperature)
        ? config.temperature
        : asNumber(this.env.LLM_TEMPERATURE, 0.2),
      maxTokens: Number.isFinite(config.maxTokensPerTurn)
        ? config.maxTokensPerTurn
        : asNumber(this.env.LLM_MAX_TOKENS, 700),
      timeoutMs: asNumber(this.env.LLM_TIMEOUT_MS, 20000),
    };
  }

  private resolveApiKey(provider: LlmProvider): string | undefined {
    switch (provider) {
      case "openai":
        return pickFirst(this.env.OPENAI_API_KEY, this.env.LLM_API_KEY);
      case "groq":
        return pickFirst(this.env.GROQ_API_KEY, this.env.LLM_API_KEY, this.env.OPENAI_API_KEY);
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
      case "groq":
        return pickFirst(this.env.GROQ_BASE_URL, this.env.LLM_BASE_URL, "https://api.groq.com/openai");
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