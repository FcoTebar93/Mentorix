import type { InterviewAccessLink } from "../../domain/interview/link/types.js";
import type { InterviewSessionProps, UUID } from "../../domain/interview/session/types.js";
import type { InterviewTemplate } from "../../domain/interview/template/types.js";

export interface InterviewTemplateRepository {
  save(template: InterviewTemplate): Promise<void>;
  getById(id: UUID): Promise<InterviewTemplate | null>;
  getByIdForOwner(id: UUID, ownerUserId: UUID): Promise<InterviewTemplate | null>;
  listByOwner(ownerUserId: UUID): Promise<InterviewTemplate[]>;
  removeByIdForOwner(id: UUID, ownerUserId: UUID): Promise<boolean>;
}

export interface InterviewAccessLinkRepository {
  save(link: InterviewAccessLink): Promise<void>;
  getById(id: UUID): Promise<InterviewAccessLink | null>;
  getByTokenHash(tokenHash: string): Promise<InterviewAccessLink | null>;
  listByTemplateId(templateId: UUID): Promise<InterviewAccessLink[]>;
}

export interface InterviewSessionRepository {
  save(session: InterviewSessionProps): Promise<void>;
  getById(id: UUID): Promise<InterviewSessionProps | null>;
  getByIdForOwner(id: UUID, ownerUserId: UUID): Promise<InterviewSessionProps | null>;
  list(params?: { ownerUserId?: string; status?: string; limit?: number }): Promise<InterviewSessionProps[]>;
}