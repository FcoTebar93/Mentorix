import type {
  InterviewSessionRepository,
  InterviewTemplateRepository,
} from "../ports/repositories.js";
import type { ITtsServiceFactory } from "../ports/services.js";
import { extractSpokenQuestion } from "../voice/spoken-question.js";
import { TimingTrace } from "../../lib/observability/timing.js";

export interface SynthesizeQuestionAudioCommand {
  sessionId: string;
  questionId: string;
}

export interface SynthesizeQuestionAudioResult {
  audioBase64: string;
  locale: string;
}

export class SynthesizeQuestionAudioCase {
  constructor(
    private readonly sessions: InterviewSessionRepository,
    private readonly templates: InterviewTemplateRepository,
    private readonly ttsFactory: ITtsServiceFactory
  ) {}

  async execute(command: SynthesizeQuestionAudioCommand): Promise<SynthesizeQuestionAudioResult> {
    const trace = new TimingTrace("synthesize_question_audio", {
      sessionId: command.sessionId,
      questionId: command.questionId,
    });

    try {
      const session = await trace.step("load_session", () => this.sessions.getById(command.sessionId));
      if (!session) throw new Error("SESSION_NOT_FOUND");

      const question = session.questions.find((q) => q.id === command.questionId);
      if (!question) throw new Error("QUESTION_NOT_FOUND");

      const template = await trace.step("load_template", () => this.templates.getById(session.templateId));
      if (!template) throw new Error("TEMPLATE_NOT_FOUND");

      const locale = this.resolveLocale(template.voiceConfig?.locale, template.language);

      const tts = this.ttsFactory.forVoiceConfig(template.voiceConfig);
      const spokenText = extractSpokenQuestion(question.text) || question.text;
      const result = await trace.step("tts_synthesize", () => tts.synthesize({ text: spokenText, locale }));

      trace.end({
        locale,
        textLength: spokenText.length,
        audioGenerated: Boolean(result.audioBase64),
      });

      return {
        audioBase64: result.audioBase64,
        locale,
      };
    } catch (error) {
      trace.end({ failed: true, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private resolveLocale(voiceLocale: string | undefined, language: string): string {
    if (voiceLocale && voiceLocale.trim().length > 0) return voiceLocale;
    if (language && language.trim().length > 0) return language;
    return "es-ES";
  }
}
