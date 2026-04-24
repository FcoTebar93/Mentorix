import type { InterviewAccessLink } from "../../domain/interview/link/types.js";
import type { InterviewSessionProps, UUID } from "../../domain/interview/session/types.js";
import type { InterviewTemplate } from "../../domain/interview/template/types.js";

export interface InterviewTemplateRepository {
  save(template: InterviewTemplate): Promise<void>;
  getById(id: UUID): Promise<InterviewTemplate | null>;
}

export interface InterviewAccessLinkRepository {
  save(link: InterviewAccessLink): Promise<void>;
  getById(id: UUID): Promise<InterviewAccessLink | null>;
  getByTokenHash(tokenHash: string): Promise<InterviewAccessLink | null>;
}

export interface InterviewSessionRepository {
  save(session: InterviewSessionProps): Promise<void>;
  getById(id: UUID): Promise<InterviewSessionProps | null>;
  getByIdForOwner(id: UUID, ownerUserId: UUID): Promise<InterviewSessionProps | null>;
  list(params?: { ownerUserId?: string; status?: string; limit?: number }): Promise<InterviewSessionProps[]>;
}