import { InterviewSession } from "../../domain/interview/session/session.aggregate.js";
import type { SessionQuestion } from "../../domain/interview/session/types.js";
import type {
  InterviewSessionRepository,
  InterviewTemplateRepository,
} from "../ports/repositories.js";
import type { Clock, ILlmServiceFactory, IdGenerator } from "../ports/services.js";

export interface CompleteSessionCommand {
  sessionId: string;
}

export class CompleteSessionCase {
  constructor(
    private readonly sessions: InterviewSessionRepository,
    private readonly templates: InterviewTemplateRepository,
    private readonly llmFactory: ILlmServiceFactory,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: CompleteSessionCommand) {
    const stored = await this.sessions.getById(command.sessionId);
    if (!stored) throw new Error("SESSION_NOT_FOUND");

    const session = new InterviewSession(stored);
    const now = this.clock.nowISO();

    session.nextOrComplete(now);

    if (session.state.status === "ASKING") {
      const template = await this.templates.getById(session.state.templateId);
      if (!template) throw new Error("TEMPLATE_NOT_FOUND");

      let nextQuestionText: string;
      if (template.templateType === "question_set") {
        const next = template.questions?.[session.state.currentQuestionIndex];
        if (!next) throw new Error("TEMPLATE_QUESTION_NOT_FOUND");
        nextQuestionText = next;
      } else {
        const llm = this.llmFactory.forTemplate(template.llmConfig);

        let generated: { text: string };
        try {
          generated = await llm.generateQuestion({
            role: template.role,
            level: template.level,
            language: template.language,
            previousQuestions: session.state.questions.map((q) => q.text),
            prompt: template.prompt,
          });
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("LLM_")) {
            throw error;
          }
          throw new Error("LLM_QUESTION_GENERATION_FAILED");
        }
        nextQuestionText = generated.text;
      }

      const nextQuestion: SessionQuestion = {
        id: this.ids.uuid(),
        index: session.state.currentQuestionIndex + 1,
        text: nextQuestionText,
        generatedByModel: template.llmConfig.model,
        createdAt: now,
      };

      session.deliverQuestion(nextQuestion);
    }

    await this.sessions.save(session.state);
    return session.state;
  }
}