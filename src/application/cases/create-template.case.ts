import type { InterviewTemplate } from "../../domain/interview/template/types.js";
import type { InterviewTemplateRepository } from "../ports/repositories.js";
import type { Clock, IdGenerator } from "../ports/services.js";

export interface CreateTemplateCommand {
  ownerUserId: string;
  title: string;
  role: string;
  level: "junior" | "mid" | "senior";
  language: string;
  totalQuestions: number;
  rubric: InterviewTemplate["rubric"];
  llmConfig: InterviewTemplate["llmConfig"];
  voiceConfig?: InterviewTemplate["voiceConfig"];
}

export class CreateTemplateCase {
  constructor(
    private readonly templates: InterviewTemplateRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: CreateTemplateCommand): Promise<InterviewTemplate> {
    const now = this.clock.nowISO();

    const template: InterviewTemplate = {
      id: this.ids.uuid(),
      ownerUserId: command.ownerUserId,
      title: command.title,
      role: command.role,
      level: command.level,
      language: command.language,
      totalQuestions: command.totalQuestions,
      rubric: command.rubric,
      llmConfig: command.llmConfig,
      voiceConfig: command.voiceConfig,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.templates.save(template);
    return template;
  }
}