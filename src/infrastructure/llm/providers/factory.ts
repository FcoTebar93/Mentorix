import type { ILlmService } from "../../../application/ports/services.js";
import type { LlmProviderConfig } from "../../config.llm.js";

import { AnthropicProvider } from "./anthropic.provider.js";
import { CustomProvider } from "./custom.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { MockProvider } from "./mock.provider.js";
import { OllamaProvider } from "./ollama.provider.js";
import { OpenAiProvider } from "./openai.provider.js";

export function createLlmService(cfg: LlmProviderConfig): ILlmService {
  switch (cfg.provider) {
    case "openai":
      return new OpenAiProvider(cfg);
    case "anthropic":
      return new AnthropicProvider(cfg);
    case "google":
      return new GeminiProvider(cfg);
    case "ollama":
      return new OllamaProvider(cfg);
    case "azure":
      throw new Error("AZURE_PROVIDER_NOT_IMPLEMENTED_YET");
    case "custom":
      return new CustomProvider(cfg);
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`UNSUPPORTED_LLM_PROVIDER: ${(cfg as any).provider}`);
  }
}