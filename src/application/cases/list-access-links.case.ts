import type { InterviewAccessLink } from "../../domain/interview/link/types.js";
import type {
  InterviewAccessLinkRepository,
  InterviewTemplateRepository,
} from "../ports/repositories.js";

export interface ListAccessLinksQuery {
  ownerUserId: string;
  templateId: string;
}

export class ListAccessLinksCase {
  constructor(
    private readonly links: InterviewAccessLinkRepository,
    private readonly templates: InterviewTemplateRepository
  ) {}

  async execute(query: ListAccessLinksQuery): Promise<InterviewAccessLink[]> {
    const template = await this.templates.getById(query.templateId);
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");
    if (template.ownerUserId !== query.ownerUserId) throw new Error("FORBIDDEN");

    return this.links.listByTemplateId(query.templateId);
  }
}
