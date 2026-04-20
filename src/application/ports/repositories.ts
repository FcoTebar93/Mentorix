import { InterviewAccessLink } from "../../domain/interview/link/types";
import { InterviewSessionProps, UUID } from "../../domain/interview/session/types";
import { InterviewTemplate } from "../../domain/interview/template/types";

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
}