import type { LlmInterviewConfig, VoiceInterviewConfig } from "../../domain/interview/template/types.js";
import type {
  ILlmServiceFactory,
  ILlmStreamService,
  ILlmStreamServiceFactory,
  ISttServiceFactory,
  ISttStreamService,
  ISttStreamServiceFactory,
  ITtsServiceFactory,
  ITtsStreamService,
  ITtsStreamServiceFactory,
} from "../../application/ports/services.js";

class AdapterSttStreamService implements ISttStreamService {
  constructor(private readonly baseFactory: ISttServiceFactory, private readonly voiceConfig?: VoiceInterviewConfig) {}

  async *transcribeStream(input: { audioBase64: string; locale: string }) {
    const stt = this.baseFactory.forVoiceConfig(this.voiceConfig);
    const result = await stt.transcribe(input);
    const text = result.text?.trim() ?? "";
    if (text) {
      yield { type: "partial" as const, text };
      yield { type: "final" as const, text };
    } else {
      yield { type: "final" as const, text: "" };
    }
  }
}

class AdapterLlmStreamService implements ILlmStreamService {
  async *streamText(text: string) {
    const tokens = text.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      yield { type: "token" as const, token: `${token} ` };
    }
    yield { type: "done" as const };
  }
}

class AdapterTtsStreamService implements ITtsStreamService {
  constructor(private readonly baseFactory: ITtsServiceFactory, private readonly voiceConfig?: VoiceInterviewConfig) {}

  async *synthesizeStream(input: { text: string; locale: string }) {
    const tts = this.baseFactory.forVoiceConfig(this.voiceConfig);
    const result = await tts.synthesize(input);
    const audio = result.audioBase64 ?? "";
    const chunkSize = 8_000;
    let chunkIndex = 0;
    for (let i = 0; i < audio.length; i += chunkSize) {
      yield {
        type: "chunk" as const,
        audioBase64Chunk: audio.slice(i, i + chunkSize),
        chunkIndex,
      };
      chunkIndex += 1;
    }
    yield { type: "done" as const };
  }
}

export class AdapterSttStreamServiceFactory implements ISttStreamServiceFactory {
  constructor(private readonly baseFactory: ISttServiceFactory) {}
  forVoiceConfig(config?: VoiceInterviewConfig): ISttStreamService {
    return new AdapterSttStreamService(this.baseFactory, config);
  }
}

export class AdapterTtsStreamServiceFactory implements ITtsStreamServiceFactory {
  constructor(private readonly baseFactory: ITtsServiceFactory) {}
  forVoiceConfig(config?: VoiceInterviewConfig): ITtsStreamService {
    return new AdapterTtsStreamService(this.baseFactory, config);
  }
}

export class AdapterLlmStreamServiceFactory implements ILlmStreamServiceFactory {
  constructor(private readonly _baseFactory: ILlmServiceFactory) {}
  forTemplate(_config: LlmInterviewConfig): ILlmStreamService {
    return new AdapterLlmStreamService();
  }
}
