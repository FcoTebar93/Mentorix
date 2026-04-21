import type { InterviewAccessLink } from "../../domain/interview/link/types.js";
import type {
  InterviewAccessLinkRepository,
  InterviewTemplateRepository,
} from "../ports/repositories.js";
import type { Clock, IdGenerator, TokenService } from "../ports/services.js";

export interface CreateAccessLinkCommand {
  ownerUserId: string;
  templateId: string;
  maxUses?: number;
  expiresAt?: string;
}

export class CreateAccessLinkCase {
  constructor(
    private readonly links: InterviewAccessLinkRepository,
    private readonly templates: InterviewTemplateRepository,
    private readonly tokenService: TokenService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: CreateAccessLinkCommand): Promise<InterviewAccessLink> {
    const template = await this.templates.getById(command.templateId);
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");
    if (template.ownerUserId !== command.ownerUserId) throw new Error("FORBIDDEN");

    const rawToken = await this.tokenService.generateSecureToken();
    const tokenHash = await this.tokenService.hash(rawToken);

    const link: InterviewAccessLink = {
      id: this.ids.uuid(),
      templateId: command.templateId,
      ownerUserId: command.ownerUserId,
      tokenHash,
      status: "active",
      maxUses: command.maxUses,
      usedCount: 0,
      expiresAt: command.expiresAt,
      createdAt: this.clock.nowISO(),
    };

    await this.links.save(link);
    return link;
  }
}