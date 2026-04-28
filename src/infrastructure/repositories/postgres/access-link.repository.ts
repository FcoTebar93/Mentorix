import { desc, eq } from "drizzle-orm";
import type { InterviewAccessLinkRepository } from "../../../application/ports/repositories.js";
import type { InterviewAccessLink } from "../../../domain/interview/link/types.js";
import { getDb } from "../../db/client.js";
import { interviewAccessLinksTable } from "../../db/schema.js";

export class PgInterviewAccessLinkRepository implements InterviewAccessLinkRepository {
  async save(link: InterviewAccessLink): Promise<void> {
    await getDb()
      .insert(interviewAccessLinksTable)
      .values({
        id: link.id,
        templateId: link.templateId,
        ownerUserId: link.ownerUserId,
        tokenHash: link.tokenHash,
        status: link.status,
        maxUses: link.maxUses ?? null,
        usedCount: link.usedCount,
        expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
        createdAt: new Date(link.createdAt),
        revokedAt: link.revokedAt ? new Date(link.revokedAt) : null,
      })
      .onConflictDoUpdate({
        target: interviewAccessLinksTable.id,
        set: {
          status: link.status,
          maxUses: link.maxUses ?? null,
          usedCount: link.usedCount,
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
          revokedAt: link.revokedAt ? new Date(link.revokedAt) : null,
        },
      });
  }

  async getById(id: string): Promise<InterviewAccessLink | null> {
    const rows = await getDb()
      .select()
      .from(interviewAccessLinksTable)
      .where(eq(interviewAccessLinksTable.id, id))
      .limit(1);

    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async getByTokenHash(tokenHash: string): Promise<InterviewAccessLink | null> {
    const rows = await getDb()
      .select()
      .from(interviewAccessLinksTable)
      .where(eq(interviewAccessLinksTable.tokenHash, tokenHash))
      .limit(1);

    const row = rows[0];
    return row ? this.toDomain(row) : null;
  }

  async listByTemplateId(templateId: string): Promise<InterviewAccessLink[]> {
    const rows = await getDb()
      .select()
      .from(interviewAccessLinksTable)
      .where(eq(interviewAccessLinksTable.templateId, templateId))
      .orderBy(desc(interviewAccessLinksTable.createdAt));

    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: typeof interviewAccessLinksTable.$inferSelect): InterviewAccessLink {
    return {
      id: row.id,
      templateId: row.templateId,
      ownerUserId: row.ownerUserId,
      tokenHash: row.tokenHash,
      status: row.status as InterviewAccessLink["status"],
      maxUses: row.maxUses ?? undefined,
      usedCount: row.usedCount,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : undefined,
      createdAt: row.createdAt.toISOString(),
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : undefined,
    };
  }
}