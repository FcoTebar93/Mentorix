import type { ILlmStreamService, ISttStreamService, ITtsStreamService, SttStreamEvent, TtsStreamEvent } from "../ports/services.js";
import type { CompleteTurnCase } from "./complete-turn.case.js";
import { extractSpokenQuestion } from "../voice/spoken-question.js";
import { performance } from "node:perf_hooks";
import { TimingTrace } from "../../lib/observability/timing.js";

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
    const trace = new TimingTrace("realtime_voice_turn", {
      sessionId: input.sessionId,
      questionId: input.questionId,
      locale: input.locale,
      mode: input.answerAudioBase64 ? "voice" : "text",
      rubricDimensions: input.rubricDimensions.length,
    });

    try {
      let transcript = input.answerText?.trim() ?? "";
      if (!transcript) {
        if (!input.answerAudioBase64?.trim()) {
          throw new Error("VOICE_TRANSCRIPTION_EMPTY");
        }
        const sttStartedAt = performance.now();
        for await (const event of this.sttStream.transcribeStream({
          audioBase64: input.answerAudioBase64,
          locale: input.locale,
        })) {
          const mapped = this.mapSttEvent(event);
          yield mapped;
          if (mapped.type === "stt_final") {
            transcript = mapped.text.trim();
          }
        }
        trace.mark("stt_stream", {
          durationMs: Math.round((performance.now() - sttStartedAt) * 100) / 100,
          transcriptLength: transcript.length,
        });
      }
      if (!transcript) {
        throw new Error("VOICE_TRANSCRIPTION_EMPTY");
      }

      const result = await trace.step("complete_turn", () =>
        this.completeTurn.execute({
          sessionId: input.sessionId,
          questionId: input.questionId,
          source: input.answerAudioBase64 ? "voice" : "text",
          text: transcript,
          rubricDimensions: input.rubricDimensions,
        })
      );

      const nextText = result.nextQuestion?.text ?? null;
      if (nextText) {
        const spokenText = extractSpokenQuestion(nextText) || nextText;
        try {
          const ttsStartedAt = performance.now();
          for await (const audioEvent of this.ttsStream.synthesizeStream({ text: spokenText, locale: input.locale })) {
            yield this.mapTtsEvent(audioEvent);
          }
          trace.mark("tts_stream_next_question", {
            durationMs: Math.round((performance.now() - ttsStartedAt) * 100) / 100,
            spokenTextLength: spokenText.length,
          });
        } catch {
          trace.mark("tts_stream_next_question_unavailable");
          yield { type: "tts_done" };
        }
      }

      trace.end({
        isCompleted: result.isCompleted,
        nextQuestionGenerated: Boolean(nextText),
        nextQuestionSource: result.nextQuestion?.source ?? null,
      });

      yield {
        type: "turn_completed",
        isCompleted: result.isCompleted,
        nextQuestionId: result.nextQuestion?.id ?? null,
        nextQuestionText: nextText,
      };
    } catch (error) {
      trace.end({ failed: true, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private mapSttEvent(event: SttStreamEvent): RealtimeVoiceEvent {
    if (event.type === "partial") return { type: "stt_partial", text: event.text };
    return { type: "stt_final", text: event.text };
  }

  private mapTtsEvent(event: TtsStreamEvent): RealtimeVoiceEvent {
    if (event.type === "chunk") {
      return { type: "tts_chunk", audioBase64Chunk: event.audioBase64Chunk, chunkIndex: event.chunkIndex };
    }
    return { type: "tts_done" };
  }
}
