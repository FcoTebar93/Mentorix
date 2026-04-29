import { and, desc, eq } from "drizzle-orm";
import type { InterviewSessionRepository } from "../../../application/ports/repositories.js";
import type { InterviewSessionProps } from "../../../domain/interview/session/types.js";
import { getDb } from "../../db/client.js";
import { interviewSessionsTable } from "../../db/schema.js";

export class PgInterviewSessionRepository implements InterviewSessionRepository {
  async save(session: InterviewSessionProps): Promise<void> {
    await getDb()
      .insert(interviewSessionsTable)
      .values({
        id: session.id,
        templateId: session.templateId,
        ownerUserId: session.ownerUserId,
        participant: session.participant,
        entryPoint: session.entryPoint,
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.totalQuestions,
        questions: session.questions,
        answers: session.answers,
        evaluations: session.evaluations,
        feedbackItems: session.feedbackItems,
        startedAt: session.startedAt ? new Date(session.startedAt) : null,
        endedAt: session.endedAt ? new Date(session.endedAt) : null,
        version: session.version,
      })
      .onConflictDoUpdate({
        target: interviewSessionsTable.id,
        set: {
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          totalQuestions: session.totalQuestions,
          questions: session.questions,
          answers: session.answers,
          evaluations: session.evaluations,
          feedbackItems: session.feedbackItems,
          startedAt: session.startedAt ? new Date(session.startedAt) : null,
          endedAt: session.endedAt ? new Date(session.endedAt) : null,
          version: session.version,
        },
      });
  }

  async getById(id: string): Promise<InterviewSessionProps | null> {
    const rows = await getDb()
      .select()
      .from(interviewSessionsTable)
      .where(eq(interviewSessionsTable.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      templateId: row.templateId,
      ownerUserId: row.ownerUserId,
      participant: row.participant as InterviewSessionProps["participant"],
      entryPoint: row.entryPoint as InterviewSessionProps["entryPoint"],
      status: row.status as InterviewSessionProps["status"],
      currentQuestionIndex: row.currentQuestionIndex,
      totalQuestions: row.totalQuestions,
      questions: row.questions as InterviewSessionProps["questions"],
      answers: row.answers as InterviewSessionProps["answers"],
      evaluations: row.evaluations as InterviewSessionProps["evaluations"],
      feedbackItems: row.feedbackItems as InterviewSessionProps["feedbackItems"],
      startedAt: row.startedAt ? row.startedAt.toISOString() : undefined,
      endedAt: row.endedAt ? row.endedAt.toISOString() : undefined,
      version: row.version,
    };
  }

  async list(params?: { ownerUserId?: string; status?: string; limit?: number }): Promise<InterviewSessionProps[]> {    
    const limit = Math.max(1, Math.min(params?.limit ?? 20, 100));
    const status = params?.status;
    const ownerUserId = params?.ownerUserId;
  
    const conditions = [
      ownerUserId ? eq(interviewSessionsTable.ownerUserId, ownerUserId) : undefined,
      status ? eq(interviewSessionsTable.status, status) : undefined,
    ].filter(Boolean);

    const rows = await getDb()
      .select()
      .from(interviewSessionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(interviewSessionsTable.startedAt))
      .limit(limit);
  
    return rows.map((row) => ({
      id: row.id,
      templateId: row.templateId,
      ownerUserId: row.ownerUserId,
      participant: row.participant as InterviewSessionProps["participant"],
      entryPoint: row.entryPoint as InterviewSessionProps["entryPoint"],
      status: row.status as InterviewSessionProps["status"],
      currentQuestionIndex: row.currentQuestionIndex,
      totalQuestions: row.totalQuestions,
      questions: row.questions as InterviewSessionProps["questions"],
      answers: row.answers as InterviewSessionProps["answers"],
      evaluations: row.evaluations as InterviewSessionProps["evaluations"],
      feedbackItems: row.feedbackItems as InterviewSessionProps["feedbackItems"],
      startedAt: row.startedAt ? row.startedAt.toISOString() : undefined,
      endedAt: row.endedAt ? row.endedAt.toISOString() : undefined,
      version: row.version,
    }));
  }

  async getByIdForOwner(id: string, ownerUserId: string): Promise<InterviewSessionProps | null> {
    const rows = await getDb()
      .select()
      .from(interviewSessionsTable)
      .where(
        and(
          eq(interviewSessionsTable.id, id),
          eq(interviewSessionsTable.ownerUserId, ownerUserId)
        )
      )
      .limit(1);
  
    const row = rows[0];
    if (!row) return null;
  
    return {
      id: row.id,
      templateId: row.templateId,
      ownerUserId: row.ownerUserId,
      participant: row.participant as InterviewSessionProps["participant"],
      entryPoint: row.entryPoint as InterviewSessionProps["entryPoint"],
      status: row.status as InterviewSessionProps["status"],
      currentQuestionIndex: row.currentQuestionIndex,
      totalQuestions: row.totalQuestions,
      questions: row.questions as InterviewSessionProps["questions"],
      answers: row.answers as InterviewSessionProps["answers"],
      evaluations: row.evaluations as InterviewSessionProps["evaluations"],
      feedbackItems: row.feedbackItems as InterviewSessionProps["feedbackItems"],
      startedAt: row.startedAt ? row.startedAt.toISOString() : undefined,
      endedAt: row.endedAt ? row.endedAt.toISOString() : undefined,
      version: row.version,
    };
  }

  async removeByIdForOwner(id: string, ownerUserId: string): Promise<boolean> {
    const result = await getDb()
      .delete(interviewSessionsTable)
      .where(and(eq(interviewSessionsTable.id, id), eq(interviewSessionsTable.ownerUserId, ownerUserId)));

    return (result.rowCount ?? 0) > 0;
  }
}