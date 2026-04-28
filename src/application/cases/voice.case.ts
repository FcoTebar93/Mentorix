import type { CompleteTurnCase } from "./complete-turn.case.js";
import type { ISttService, ITtsService } from "../ports/services.js";

export interface VoiceTurnCommand {
  sessionId: string;
  questionId: string;
  answerAudioBase64: string;
  rubricDimensions: { key: string; weight: number }[];
  locale: string;
}

export interface VoiceTurnResult {
  transcript: string;
  result: Awaited<ReturnType<CompleteTurnCase["execute"]>>;
  nextQuestionAudioBase64: string | null;
}

export class VoiceTurnCase {
  constructor(
    private readonly sttService: ISttService,
    private readonly ttsService: ITtsService,
    private readonly completeTurn: CompleteTurnCase
  ) {}

  async execute(command: VoiceTurnCommand): Promise<VoiceTurnResult> {
    const stt = await this.sttService.transcribe({
      audioBase64: command.answerAudioBase64,
      locale: command.locale,
    });

    const transcript = stt.text?.trim();
    if (!transcript) {
      throw new Error("VOICE_TRANSCRIPTION_EMPTY");
    }

    const result = await this.completeTurn.execute({
      sessionId: command.sessionId,
      questionId: command.questionId,
      source: "voice",
      text: transcript,
      rubricDimensions: command.rubricDimensions,
    });

    let nextQuestionAudioBase64: string | null = null;
    if (!result.isCompleted && result.nextQuestion?.text) {
      const tts = await this.ttsService.synthesize({
        text: result.nextQuestion.text,
        locale: command.locale,
      });
      nextQuestionAudioBase64 = tts.audioBase64;
    }

    return {
      transcript,
      result,
      nextQuestionAudioBase64,
    };
  }
}