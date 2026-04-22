import { z } from "zod";

export const SessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const StartFromLinkBodySchema = z.object({
  rawToken: z.string().min(1),
  guestAlias: z.string().optional(),
  fingerprintHash: z.string().optional(),
});

export const SubmitAnswerBodySchema = z.object({
  questionId: z.string().min(1),
  source: z.enum(["voice", "text"]),
  text: z.string().min(1),
});

export const EvaluateBodySchema = z.object({
  rubricDimensions: z
    .array(
      z.object({
        key: z.string().min(1),
        weight: z.number().positive(),
      })
    )
    .min(1),
});

export const ListSessionsQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const ListSessionReportsQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});