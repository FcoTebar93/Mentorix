import type {
    InterviewAccessLinkRepository,
    InterviewSessionRepository,
    InterviewTemplateRepository,
  } from "../../application/ports/repositories.js";
import type { InterviewAccessLink } from "../../domain/interview/link/types.js";
import type { InterviewSessionProps, UUID } from "../../domain/interview/session/types.js";
import type { InterviewTemplate } from "../../domain/interview/template/types.js";

export class InMemoryInterviewTemplateRepository implements InterviewTemplateRepository {
    private readonly store = new Map<UUID, InterviewTemplate>();
  
    async save(template: InterviewTemplate): Promise<void> {
      this.store.set(template.id, structuredClone(template));
    }
  
    async getById(id: UUID): Promise<InterviewTemplate | null> {
      const value = this.store.get(id);
      return value ? structuredClone(value) : null;
    }

    async getByIdForOwner(id: UUID, ownerUserId: UUID): Promise<InterviewTemplate | null> {
      const value = this.store.get(id);
      if (!value) return null;
      if (value.ownerUserId !== ownerUserId) return null;
      return structuredClone(value);
    }

    async listByOwner(ownerUserId: UUID): Promise<InterviewTemplate[]> {
      return Array.from(this.store.values())
        .filter((t) => t.ownerUserId === ownerUserId)
        .map((t) => structuredClone(t));
    }

    async removeByIdForOwner(id: UUID, ownerUserId: UUID): Promise<boolean> {
      const value = this.store.get(id);
      if (!value) return false;
      if (value.ownerUserId !== ownerUserId) return false;
      this.store.delete(id);
      return true;
    }
}
  
export class InMemoryInterviewAccessLinkRepository implements InterviewAccessLinkRepository {
    private readonly store = new Map<UUID, InterviewAccessLink>();
    private readonly byTokenHash = new Map<string, InterviewAccessLink>();

    async save(link: InterviewAccessLink): Promise<void> {
      this.store.set(link.id, structuredClone(link));
      this.byTokenHash.set(link.tokenHash, structuredClone(link));
    }
    async getById(id: UUID): Promise<InterviewAccessLink | null> {
      const value = this.store.get(id);
      return value ? structuredClone(value) : null;
    }
  
    async getByTokenHash(tokenHash: string): Promise<InterviewAccessLink | null> {
        const value = this.byTokenHash.get(tokenHash);
      return value ? structuredClone(value) : null;
    }

    async listByTemplateId(templateId: UUID): Promise<InterviewAccessLink[]> {
      return Array.from(this.store.values())
        .filter((l) => l.templateId === templateId)
        .map((l) => structuredClone(l));
    }
}

export class InMemoryInterviewSessionRepository implements InterviewSessionRepository {
    private readonly store = new Map<UUID, InterviewSessionProps>();
  
    async save(session: InterviewSessionProps): Promise<void> {
      this.store.set(session.id, structuredClone(session));
    }
  
    async getById(id: UUID): Promise<InterviewSessionProps | null> {
      const value = this.store.get(id);
      return value ? structuredClone(value) : null;
    }

    async list(params?: { ownerUserId?: string; status?: string; limit?: number }): Promise<InterviewSessionProps[]> {
      const ownerUserId = params?.ownerUserId;
      const status = params?.status;
      const limit = params?.limit ?? 20;
    
      const items = Array.from(this.store.values())
        .map((s) => structuredClone(s))
        .filter((s) => (ownerUserId ? s.ownerUserId === ownerUserId : true))
        .filter((s) => (status ? s.status === status : true))
        .slice(0, Math.max(0, Math.min(limit, 100)));
    
      return items;
    }

    async getByIdForOwner(id: UUID, ownerUserId: UUID): Promise<InterviewSessionProps | null> {
      const value = this.store.get(id);
      if (!value) return null;
      if (value.ownerUserId !== ownerUserId) return null;
      return structuredClone(value);
    }
}