import type {
  InterviewSessionRepository,
  InterviewTemplateRepository,
} from "../ports/repositories.js";
import type { ITtsServiceFactory } from "../ports/services.js";

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
    const session = await this.sessions.getById(command.sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");

    const question = session.questions.find((q) => q.id === command.questionId);
    if (!question) throw new Error("QUESTION_NOT_FOUND");

    const template = await this.templates.getById(session.templateId);
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");

    const locale = this.resolveLocale(template.voiceConfig?.locale, template.language);

    const tts = this.ttsFactory.forVoiceConfig(template.voiceConfig);
    const result = await tts.synthesize({ text: question.text, locale });

    return {
      audioBase64: result.audioBase64,
      locale,
    };
  }

  private resolveLocale(voiceLocale: string | undefined, language: string): string {
    if (voiceLocale && voiceLocale.trim().length > 0) return voiceLocale;
    if (language && language.trim().length > 0) return language;
    return "es-ES";
  }
}
