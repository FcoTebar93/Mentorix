import type {
  ILlmStreamService,
  ISttStreamService,
  ITtsStreamService,
  LlmStreamEvent,
  SttStreamEvent,
  TtsStreamEvent,
} from "../ports/services.js";
import type { CompleteTurnCase } from "./complete-turn.case.js";

export type RealtimeVoiceInput = {
  sessionId: string;
  questionId: string;
  locale: string;
  rubricDimensions: { key: string; weight: number }[];
  answerAudioBase64?: string;
  answerText?: string;
};

export type RealtimeVoiceEvent =
  | { type: "stt_partial"; text: string }
  | { type: "stt_final"; text: string }
  | { type: "llm_token"; token: string }
  | { type: "llm_done" }
  | { type: "tts_chunk"; audioBase64Chunk: string; chunkIndex: number }
  | { type: "tts_done" }
  | { type: "turn_completed"; isCompleted: boolean; nextQuestionId: string | null; nextQuestionText: string | null };

export class RealtimeVoiceCase {
  constructor(
    private readonly sttStream: ISttStreamService,
    private readonly llmStream: ILlmStreamService,
    private readonly ttsStream: ITtsStreamService,
    private readonly completeTurn: CompleteTurnCase
  ) {}

  async *execute(input: RealtimeVoiceInput): AsyncIterable<RealtimeVoiceEvent> {
    let transcript = input.answerText?.trim() ?? "";
    if (!transcript) {
      if (!input.answerAudioBase64?.trim()) {
        throw new Error("VOICE_TRANSCRIPTION_EMPTY");
      }
      for await (const event of this.sttStream.transcribeStream({ audioBase64: input.answerAudioBase64, locale: input.locale })) {
        const mapped = this.mapSttEvent(event);
        yield mapped;
        if (mapped.type === "stt_final") {
          transcript = mapped.text.trim();
        }
      }
    }
    if (!transcript) {
      throw new Error("VOICE_TRANSCRIPTION_EMPTY");
    }
    const result = await this.completeTurn.execute({
      sessionId: input.sessionId,
      questionId: input.questionId,
      source: input.answerAudioBase64 ? "voice" : "text",
      text: transcript,
      rubricDimensions: input.rubricDimensions,
    });

    const nextText = result.nextQuestion?.text ?? null;
    const nextIsFixed = result.nextQuestion?.source === "fixed";
    if (nextText) {
      if (!nextIsFixed) {
        for await (const tokenEvent of this.llmStream.streamText(nextText)) {
          yield this.mapLlmEvent(tokenEvent);
        }
      }
      for await (const audioEvent of this.ttsStream.synthesizeStream({ text: nextText, locale: input.locale })) {
        yield this.mapTtsEvent(audioEvent);
      }
    }

    yield {
      type: "turn_completed",
      isCompleted: result.isCompleted,
      nextQuestionId: result.nextQuestion?.id ?? null,
      nextQuestionText: nextText,
    };
  }

  private mapSttEvent(event: SttStreamEvent): RealtimeVoiceEvent {
    if (event.type === "partial") return { type: "stt_partial", text: event.text };
    return { type: "stt_final", text: event.text };
  }

  private mapLlmEvent(event: LlmStreamEvent): RealtimeVoiceEvent {
    if (event.type === "token") return { type: "llm_token", token: event.token };
    return { type: "llm_done" };
  }

  private mapTtsEvent(event: TtsStreamEvent): RealtimeVoiceEvent {
    if (event.type === "chunk") {
      return { type: "tts_chunk", audioBase64Chunk: event.audioBase64Chunk, chunkIndex: event.chunkIndex };
    }
    return { type: "tts_done" };
  }
}
