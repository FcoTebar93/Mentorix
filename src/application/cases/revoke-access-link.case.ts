import type { InterviewAccessLink } from "../../domain/interview/link/types.js";
import type {
  InterviewAccessLinkRepository,
  InterviewTemplateRepository,
} from "../ports/repositories.js";
import type { Clock } from "../ports/services.js";

export interface RevokeAccessLinkCommand {
  ownerUserId: string;
  linkId: string;
}

export class RevokeAccessLinkCase {
  constructor(
    private readonly links: InterviewAccessLinkRepository,
    private readonly templates: InterviewTemplateRepository,
    private readonly clock: Clock
  ) {}

  async execute(command: RevokeAccessLinkCommand): Promise<InterviewAccessLink> {
    const link = await this.links.getById(command.linkId);
    if (!link) throw new Error("ACCESS_LINK_NOT_FOUND");

    const template = await this.templates.getById(link.templateId);
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");
    if (template.ownerUserId !== command.ownerUserId) throw new Error("FORBIDDEN");

    if (link.status === "revoked") return link;

    const revoked: InterviewAccessLink = {
      ...link,
      status: "revoked",
      revokedAt: this.clock.nowISO(),
    };

    await this.links.save(revoked);
    return revoked;
  }
}
