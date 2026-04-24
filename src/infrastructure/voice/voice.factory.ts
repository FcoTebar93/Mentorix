import type {
  ISttService,
  ISttServiceFactory,
  ITtsService,
  ITtsServiceFactory,
  VoiceProvider,
} from "../../application/ports/services.js";
import type { VoiceInterviewConfig } from "../../domain/interview/template/types.js";
import { MockSttProvider } from "./providers/mock-stt.provider.js";
import { MockTtsProvider } from "./providers/mock-tts.provider.js";

type FactoryEnv = NodeJS.ProcessEnv;

function normalizeVoiceProvider(provider: string | undefined, fallback: VoiceProvider = "mock"): VoiceProvider {
  if (!provider) return fallback;
  const value = provider.toLowerCase();
  if (value === "mock" || value === "openai" || value === "custom") {
    return value;
  }
  return fallback;
}

export class EnvSttServiceFactory implements ISttServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forVoiceConfig(config?: VoiceInterviewConfig): ISttService {
    const provider = normalizeVoiceProvider(config?.sttProvider, normalizeVoiceProvider(this.env.STT_PROVIDER));
    switch (provider) {
      case "openai":
      case "custom":
      case "mock":
      default:
        // Placeholder: openai/custom map to mock until providers are implemented.
        return new MockSttProvider();
    }
  }
}

export class EnvTtsServiceFactory implements ITtsServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forVoiceConfig(config?: VoiceInterviewConfig): ITtsService {
    const provider = normalizeVoiceProvider(config?.ttsProvider, normalizeVoiceProvider(this.env.TTS_PROVIDER));
    switch (provider) {
      case "openai":
      case "custom":
      case "mock":
      default:
        // Placeholder: openai/custom map to mock until providers are implemented.
        return new MockTtsProvider();
    }
  }
}
