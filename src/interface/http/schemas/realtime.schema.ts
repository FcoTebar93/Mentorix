import { z } from "zod";

export const RealtimeSessionParamsSchema = z.object({
  sessionId: z.string().min(1),
});

export const RealtimeNegotiateBodySchema = z.object({
  streamId: z.string().min(1),
  sdpOffer: z.string().min(1),
});

export const RealtimeEventsQuerySchema = z.object({
  streamId: z.string().min(1),
});

export const RealtimeInputBodySchema = z
  .object({
    streamId: z.string().min(1),
    questionId: z.string().min(1),
    locale: z.string().min(2),
    answerAudioBase64: z.string().min(1).optional(),
    answerText: z.string().min(1).optional(),
    rubricDimensions: z
      .array(
        z.object({
          key: z.string().min(1),
          weight: z.number().positive(),
        })
      )
      .min(1),
  })
  .refine((data) => !!data.answerAudioBase64 || !!data.answerText, {
    message: "answerAudioBase64 or answerText is required",
    path: ["answerAudioBase64"],
  });
