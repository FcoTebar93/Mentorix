import { ILlmService } from "../../../application/ports/services";
import { LlmProviderConfig } from "../../config.llm";
import { AnthropicProvider } from "./anthropic.provider";
import { CustomProvider } from "./custom.provider";
import { GeminiProvider } from "./gemini.provider";
import { OllamaProvider } from "./ollama.provider";
import { OpenAiProvider } from "./openai.provider";

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
    default:
      throw new Error(`UNSUPPORTED_LLM_PROVIDER: ${(cfg as any).provider}`);
  }
}