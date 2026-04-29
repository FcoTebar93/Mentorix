import { desc, eq, and } from "drizzle-orm";
import type { InterviewTemplateRepository } from "../../../application/ports/repositories.js";
import type { InterviewTemplate } from "../../../domain/interview/template/types.js";
import { getDb } from "../../db/client.js";
import { interviewTemplatesTable } from "../../db/schema.js";

export class PgInterviewTemplateRepository implements InterviewTemplateRepository {
  async save(template: InterviewTemplate): Promise<void> {
    await getDb()
      .insert(interviewTemplatesTable)
      .values({
        id: template.id,
        ownerUserId: template.ownerUserId,
        title: template.title,
        role: template.role,
        level: template.level,
        language: template.language,
        totalQuestions: template.totalQuestions,
        rubric: template.rubric,
        llmConfig: template.llmConfig,
        voiceConfig: template.voiceConfig ?? null,
        isArchived: template.isArchived,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt),
      })
      .onConflictDoUpdate({
        target: interviewTemplatesTable.id,
        set: {
          ownerUserId: template.ownerUserId,
          title: template.title,
          role: template.role,
          level: template.level,
          language: template.language,
          totalQuestions: template.totalQuestions,
          rubric: template.rubric,
          llmConfig: template.llmConfig,
          voiceConfig: template.voiceConfig ?? null,
          isArchived: template.isArchived,
          updatedAt: new Date(template.updatedAt),
        },
      });
  }

  async getById(id: string): Promise<InterviewTemplate | null> {
    const rows = await getDb()
      .select()
      .from(interviewTemplatesTable)
      .where(eq(interviewTemplatesTable.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      role: row.role,
      level: row.level as "junior" | "mid" | "senior",
      language: row.language,
      totalQuestions: row.totalQuestions,
      rubric: row.rubric as InterviewTemplate["rubric"],
      llmConfig: row.llmConfig as InterviewTemplate["llmConfig"],
      voiceConfig: (row.voiceConfig ?? undefined) as InterviewTemplate["voiceConfig"] | undefined,
      isArchived: row.isArchived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getByIdForOwner(id: string, ownerUserId: string): Promise<InterviewTemplate | null> {
    const rows = await getDb()
      .select()
      .from(interviewTemplatesTable)
      .where(and(eq(interviewTemplatesTable.id, id), eq(interviewTemplatesTable.ownerUserId, ownerUserId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      role: row.role,
      level: row.level as "junior" | "mid" | "senior",
      language: row.language,
      totalQuestions: row.totalQuestions,
      rubric: row.rubric as InterviewTemplate["rubric"],
      llmConfig: row.llmConfig as InterviewTemplate["llmConfig"],
      voiceConfig: (row.voiceConfig ?? undefined) as InterviewTemplate["voiceConfig"] | undefined,
      isArchived: row.isArchived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listByOwner(ownerUserId: string): Promise<InterviewTemplate[]> {
    const rows = await getDb()
      .select()
      .from(interviewTemplatesTable)
      .where(eq(interviewTemplatesTable.ownerUserId, ownerUserId))
      .orderBy(desc(interviewTemplatesTable.createdAt));

    return rows.map((row) => ({
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      role: row.role,
      level: row.level as "junior" | "mid" | "senior",
      language: row.language,
      totalQuestions: row.totalQuestions,
      rubric: row.rubric as InterviewTemplate["rubric"],
      llmConfig: row.llmConfig as InterviewTemplate["llmConfig"],
      voiceConfig: (row.voiceConfig ?? undefined) as InterviewTemplate["voiceConfig"] | undefined,
      isArchived: row.isArchived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async removeByIdForOwner(id: string, ownerUserId: string): Promise<boolean> {
    const result = await getDb()
      .delete(interviewTemplatesTable)
      .where(and(eq(interviewTemplatesTable.id, id), eq(interviewTemplatesTable.ownerUserId, ownerUserId)));

    return (result.rowCount ?? 0) > 0;
  }
}