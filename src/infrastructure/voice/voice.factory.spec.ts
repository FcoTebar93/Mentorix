import { afterEach, describe, expect, it, vi } from "vitest";
import { EnvSttServiceFactory, EnvTtsServiceFactory } from "./voice.factory.js";

describe("Voice factories", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses OpenAI transcription endpoint for STT", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: "transcripcion" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const factory = new EnvSttServiceFactory({
      STT_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_STT_MODEL: "whisper-1",
    } as NodeJS.ProcessEnv);
    const service = factory.forVoiceConfig();
    const result = await service.transcribe({
      audioBase64: Buffer.from("fake-audio").toString("base64"),
      locale: "es-ES",
    });

    expect(result.text).toBe("transcripcion");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/audio/transcriptions");
  });

  it("uses OpenAI speech endpoint for TTS", async () => {
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => bytes.buffer,
    });
    vi.stubGlobal("fetch", fetchMock);

    const factory = new EnvTtsServiceFactory({
      TTS_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_TTS_MODEL: "gpt-4o-mini-tts",
      OPENAI_TTS_VOICE: "alloy",
    } as NodeJS.ProcessEnv);
    const service = factory.forVoiceConfig();
    const result = await service.synthesize({ text: "hola", locale: "es-ES" });

    expect(result.audioBase64).toBe(Buffer.from(bytes).toString("base64"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/audio/speech");
  });

  it("uses custom STT/TTS HTTP services", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: "texto custom" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ audioBase64: "YWFh" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const sttFactory = new EnvSttServiceFactory({
      STT_PROVIDER: "custom",
      CUSTOM_STT_BASE_URL: "http://127.0.0.1:8081",
    } as NodeJS.ProcessEnv);
    const ttsFactory = new EnvTtsServiceFactory({
      TTS_PROVIDER: "custom",
      CUSTOM_TTS_BASE_URL: "http://127.0.0.1:8082",
    } as NodeJS.ProcessEnv);

    const sttResult = await sttFactory.forVoiceConfig().transcribe({
      audioBase64: "YWFh",
      locale: "es-ES",
    });
    const ttsResult = await ttsFactory.forVoiceConfig().synthesize({
      text: "hola",
      locale: "es-ES",
    });

    expect(sttResult.text).toBe("texto custom");
    expect(ttsResult.audioBase64).toBe("YWFh");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://127.0.0.1:8081/transcribe");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://127.0.0.1:8082/synthesize");
  });
});
