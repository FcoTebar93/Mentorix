import type {
  ISttService,
  ISttServiceFactory,
  ITtsService,
  ITtsServiceFactory,
  VoiceProvider,
} from "../../application/ports/services.js";
import type { VoiceInterviewConfig } from "../../domain/interview/template/types.js";

type FactoryEnv = NodeJS.ProcessEnv;

const SUPPORTED_VOICE_PROVIDERS: ReadonlySet<VoiceProvider> = new Set(["openai", "custom"]);

function pickFirst(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim().length > 0);
}

function normalizeVoiceProvider(provider: string | undefined): VoiceProvider {
  if (!provider || provider.trim().length === 0) {
    throw new Error("VOICE_PROVIDER_NOT_CONFIGURED");
  }

  const value = provider.trim().toLowerCase() as VoiceProvider;
  if (!SUPPORTED_VOICE_PROVIDERS.has(value)) {
    throw new Error(`UNSUPPORTED_VOICE_PROVIDER: ${provider}`);
  }

  return value;
}

class OpenAiSttProvider implements ISttService {
  async transcribe(): Promise<{ text: string }> {
    throw new Error("OPENAI_STT_PROVIDER_NOT_IMPLEMENTED");
  }
}

class OpenAiTtsProvider implements ITtsService {
  async synthesize(): Promise<{ audioBase64: string }> {
    throw new Error("OPENAI_TTS_PROVIDER_NOT_IMPLEMENTED");
  }
}

function createSttService(provider: VoiceProvider): ISttService {
  switch (provider) {
    case "openai":
      return new OpenAiSttProvider();
    case "custom":
      throw new Error("CUSTOM_STT_PROVIDER_NOT_IMPLEMENTED");
    default:
      throw new Error(`UNSUPPORTED_VOICE_PROVIDER: ${provider}`);
  }
}

function createTtsService(provider: VoiceProvider): ITtsService {
  switch (provider) {
    case "openai":
      return new OpenAiTtsProvider();
    case "custom":
      throw new Error("CUSTOM_TTS_PROVIDER_NOT_IMPLEMENTED");
    default:
      throw new Error(`UNSUPPORTED_VOICE_PROVIDER: ${provider}`);
  }
}

export class EnvSttServiceFactory implements ISttServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forVoiceConfig(config?: VoiceInterviewConfig): ISttService {
    const rawProvider = pickFirst(config?.sttProvider, this.env.STT_PROVIDER);
    const provider = normalizeVoiceProvider(rawProvider);
    return createSttService(provider);
  }
}

export class EnvTtsServiceFactory implements ITtsServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forVoiceConfig(config?: VoiceInterviewConfig): ITtsService {
    const rawProvider = pickFirst(config?.ttsProvider, this.env.TTS_PROVIDER);
    const provider = normalizeVoiceProvider(rawProvider);
    return createTtsService(provider);
  }
}