import { InterviewSession } from "../../domain/interview/session/session.aggregate.js";
import type { InterviewSessionProps, SessionQuestion } from "../../domain/interview/session/types.js";
import type { InterviewAccessLinkRepository, InterviewSessionRepository, InterviewTemplateRepository } from "../ports/repositories.js";
import type { Clock, IdGenerator, ILlmServiceFactory, TokenService } from "../ports/services.js";

export interface StartFromLinkCommand {
  rawToken: string;
  guestAlias: string;
  fingerprintHash?: string;
}

export class StartSessionFromLinkCase {
  constructor(
    private readonly links: InterviewAccessLinkRepository,
    private readonly templates: InterviewTemplateRepository,
    private readonly sessions: InterviewSessionRepository,
    private readonly llmFactory: ILlmServiceFactory,
    private readonly tokenService: TokenService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: StartFromLinkCommand): Promise<InterviewSessionProps> {
    const tokenHash = await this.tokenService.hash(command.rawToken);
    const link = await this.links.getByTokenHash(tokenHash);
    if (!link) throw new Error("ACCESS_LINK_NOT_FOUND");
    if (link.status !== "active") throw new Error("ACCESS_LINK_NOT_ACTIVE");
    if (link.expiresAt && new Date(link.expiresAt) <= new Date(this.clock.nowISO())) {
      throw new Error("ACCESS_LINK_EXPIRED");
    }
    if (typeof link.maxUses === "number" && link.usedCount >= link.maxUses) {
      throw new Error("ACCESS_LINK_MAX_USES_REACHED");
    }

    const template = await this.templates.getById(link.templateId);
    if (!template){
        throw new Error("TEMPLATE_NOT_FOUND");
    }
    let firstQuestionText: string;
    if (template.templateType === "question_set") {
      const first = template.questions?.[0];
      if (!first) throw new Error("TEMPLATE_QUESTIONS_REQUIRED");
      firstQuestionText = first;
    } else {
      const llm =
        this.llmFactory.forTemplateWithFallback?.(template.llmConfig, ["custom"]) ??
        this.llmFactory.forTemplate(template.llmConfig);
      let generated: { text: string };
      try {
        generated = await llm.generateQuestion({
          role: template.role,
          level: template.level,
          language: template.language,
          previousQuestions: [],
          prompt: template.prompt,
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("LLM_")) {
          throw error;
        }
        throw new Error("LLM_QUESTION_GENERATION_FAILED");
      }
      firstQuestionText = generated.text;
    }

    const props: InterviewSessionProps = {
      id: this.ids.uuid(),
      templateId: template.id,
      ownerUserId: template.ownerUserId,
      participant: {
        type: "guest",
        guestAlias: command.guestAlias,
        fingerprintHash: command.fingerprintHash,
      },
      entryPoint: {
        mode: "shared_link",
        accessLinkId: link.id,
      },
      status: "IDLE",
      currentQuestionIndex: 0,
      totalQuestions: template.totalQuestions,
      questions: [],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      version: 0,
    };

    const session = new InterviewSession(props);
    session.start(this.clock.nowISO());

    const firstQuestion: SessionQuestion = {
      id: this.ids.uuid(),
      index: 1,
      text: firstQuestionText,
      generatedByModel: template.llmConfig.model,
      createdAt: this.clock.nowISO(),
    };

    session.deliverQuestion(firstQuestion);

    await this.sessions.save(session.state);

    link.usedCount += 1;
    await this.links.save(link);

    return session.state;
  }
}