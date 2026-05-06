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

function asNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  constructor(
    private readonly cfg: {
      apiKey?: string;
      baseUrl?: string;
      model: string;
      timeoutMs: number;
    }
  ) {}

  async transcribe(input: { audioBase64: string; locale: string }): Promise<{ text: string }> {
    if (!this.cfg.apiKey) throw new Error("VOICE_FEATURE_NOT_AVAILABLE");

    const audioBytes = Buffer.from(input.audioBase64, "base64");
    const blob = new Blob([audioBytes], { type: "audio/webm" });
    const form = new FormData();
    form.set("file", blob, "answer.webm");
    form.set("model", this.cfg.model);
    if (input.locale) form.set("language", input.locale.split("-")[0] ?? input.locale);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const response = await fetch(`${this.cfg.baseUrl ?? "https://api.openai.com"}/v1/audio/transcriptions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: form,
      });
      if (!response.ok) {
        throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
      }
      const payload = (await response.json()) as { text?: string };
      return { text: payload.text?.trim() ?? "" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

class OpenAiTtsProvider implements ITtsService {
  constructor(
    private readonly cfg: {
      apiKey?: string;
      baseUrl?: string;
      model: string;
      voice: string;
      timeoutMs: number;
    }
  ) {}

  async synthesize(input: { text: string; locale: string }): Promise<{ audioBase64: string }> {
    if (!this.cfg.apiKey) throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const response = await fetch(`${this.cfg.baseUrl ?? "https://api.openai.com"}/v1/audio/speech`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: this.cfg.model,
          voice: this.cfg.voice,
          input: input.text,
          format: "mp3",
        }),
      });
      if (!response.ok) {
        throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { audioBase64: Buffer.from(bytes).toString("base64") };
    } finally {
      clearTimeout(timeout);
    }
  }
}

class CustomHttpSttProvider implements ISttService {
  constructor(
    private readonly cfg: {
      baseUrl?: string;
      timeoutMs: number;
    }
  ) {}

  async transcribe(input: { audioBase64: string; locale: string }): Promise<{ text: string }> {
    if (!this.cfg.baseUrl) throw new Error("CUSTOM_STT_PROVIDER_NOT_IMPLEMENTED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const response = await fetch(`${this.cfg.baseUrl}/transcribe`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
      const payload = (await response.json()) as { text?: string };
      return { text: payload.text?.trim() ?? "" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

class CustomHttpTtsProvider implements ITtsService {
  constructor(
    private readonly cfg: {
      baseUrl?: string;
      timeoutMs: number;
    }
  ) {}

  async synthesize(input: { text: string; locale: string }): Promise<{ audioBase64: string }> {
    if (!this.cfg.baseUrl) throw new Error("CUSTOM_TTS_PROVIDER_NOT_IMPLEMENTED");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const response = await fetch(`${this.cfg.baseUrl}/synthesize`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
      const payload = (await response.json()) as { audioBase64?: string };
      return { audioBase64: payload.audioBase64 ?? "" };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function createSttService(provider: VoiceProvider, env: FactoryEnv): ISttService {
  switch (provider) {
    case "openai":
      return new OpenAiSttProvider({
        apiKey: pickFirst(env.OPENAI_API_KEY, env.VOICE_API_KEY),
        baseUrl: pickFirst(env.OPENAI_BASE_URL, env.VOICE_BASE_URL),
        model: pickFirst(env.OPENAI_STT_MODEL, env.STT_MODEL, "whisper-1")!,
        timeoutMs: asNumber(env.VOICE_TIMEOUT_MS, 20000),
      });
    case "custom":
      return new CustomHttpSttProvider({
        baseUrl: pickFirst(env.CUSTOM_STT_BASE_URL, env.CUSTOM_VOICE_BASE_URL),
        timeoutMs: asNumber(env.VOICE_TIMEOUT_MS, 20000),
      });
    default:
      throw new Error(`UNSUPPORTED_VOICE_PROVIDER: ${provider}`);
  }
}

function createTtsService(provider: VoiceProvider, env: FactoryEnv): ITtsService {
  switch (provider) {
    case "openai":
      return new OpenAiTtsProvider({
        apiKey: pickFirst(env.OPENAI_API_KEY, env.VOICE_API_KEY),
        baseUrl: pickFirst(env.OPENAI_BASE_URL, env.VOICE_BASE_URL),
        model: pickFirst(env.OPENAI_TTS_MODEL, env.TTS_MODEL, "gpt-4o-mini-tts")!,
        voice: pickFirst(env.OPENAI_TTS_VOICE, "alloy")!,
        timeoutMs: asNumber(env.VOICE_TIMEOUT_MS, 20000),
      });
    case "custom":
      return new CustomHttpTtsProvider({
        baseUrl: pickFirst(env.CUSTOM_TTS_BASE_URL, env.CUSTOM_VOICE_BASE_URL),
        timeoutMs: asNumber(env.VOICE_TIMEOUT_MS, 20000),
      });
    default:
      throw new Error(`UNSUPPORTED_VOICE_PROVIDER: ${provider}`);
  }
}

export class EnvSttServiceFactory implements ISttServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forVoiceConfig(config?: VoiceInterviewConfig): ISttService {
    const rawProvider = pickFirst(config?.sttProvider, this.env.STT_PROVIDER);
    const provider = normalizeVoiceProvider(rawProvider);
    return createSttService(provider, this.env);
  }
}

export class EnvTtsServiceFactory implements ITtsServiceFactory {
  constructor(private readonly env: FactoryEnv = process.env) {}

  forVoiceConfig(config?: VoiceInterviewConfig): ITtsService {
    const rawProvider = pickFirst(config?.ttsProvider, this.env.TTS_PROVIDER);
    const provider = normalizeVoiceProvider(rawProvider);
    return createTtsService(provider, this.env);
  }
}