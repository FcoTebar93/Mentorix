import { z } from "zod";

export const TranscribeBodySchema = z.object({
  audioBase64: z.string().min(1),
  locale: z.string().min(2),
});

export const SynthesizeBodySchema = z.object({
  text: z.string().min(1),
  locale: z.string().min(2),
});
