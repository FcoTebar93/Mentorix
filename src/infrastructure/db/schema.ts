import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const interviewTemplatesTable = pgTable("interview_templates", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  title: text("title").notNull(),
  role: text("role").notNull(),
  level: text("level").notNull(),
  language: text("language").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  rubric: jsonb("rubric").notNull(),
  llmConfig: jsonb("llm_config").notNull(),
  voiceConfig: jsonb("voice_config"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const interviewAccessLinksTable = pgTable("interview_access_links", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  status: text("status").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  ownerUserId: text("owner_user_id").notNull(),

  participant: jsonb("participant").notNull(),
  entryPoint: jsonb("entry_point").notNull(),

  status: text("status").notNull(),
  currentQuestionIndex: integer("current_question_index").notNull(),
  totalQuestions: integer("total_questions").notNull(),

  questions: jsonb("questions").notNull(),
  answers: jsonb("answers").notNull(),
  evaluations: jsonb("evaluations").notNull(),
  feedbackItems: jsonb("feedback_items").notNull(),

  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),

  version: integer("version").notNull().default(0),
});