import { z } from "zod";
import type { RegisterRoutes } from "./types.js";
import { mapErrorToHttp } from "../mappers/http-error.js";
import { requireAuth } from "../auth.handler.js";

const LlmProviderSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "azure",
  "ollama",
  "custom",
  "mock",
]);

const LlmConfigSchema = z.object({
  provider: LlmProviderSchema,
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokensPerTurn: z.number().int().positive().max(8000),
});

const CreateTemplateBodySchema = z.object({
  title: z.string().min(1),
  role: z.string().min(1),
  level: z.enum(["junior", "mid", "senior"]),
  language: z.string().min(2),
  totalQuestions: z.number().int().positive(),
  rubric: z.object({
    dimensions: z.array(
      z.object({
        key: z.string().min(1),
        weight: z.number().positive(),
        description: z.string().min(1),
      })
    ),
    passThreshold: z.number().min(0).max(100),
  }),
  llmConfig: LlmConfigSchema,
  voiceConfig: z
    .object({
      sttProvider: z.string().min(1),
      ttsProvider: z.string().min(1),
      locale: z.string().min(2),
    })
    .optional(),
});

export const registerTemplateRoutes: RegisterRoutes = (app, container) => {
  app.post("/v1/templates", { preHandler: requireAuth }, async (request, reply) => {
    const parsedBody = CreateTemplateBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    try {
      const template = await container.useCases.createTemplate.execute({
        ownerUserId: request.user!.id,
        title: parsedBody.data.title,
        role: parsedBody.data.role,
        level: parsedBody.data.level,
        language: parsedBody.data.language,
        totalQuestions: parsedBody.data.totalQuestions,
        rubric: parsedBody.data.rubric,
        llmConfig: parsedBody.data.llmConfig,
        voiceConfig: parsedBody.data.voiceConfig,
      });

      return reply.code(201).send({
        code: "OK",
        data: template,
      });
    } catch (error) {
      request.log.error({ error }, "create template failed");
      const mapped = mapErrorToHttp(error);

      return reply.code(mapped.statusCode).send({
        code: mapped.code,
        message: mapped.message,
      });
    }
  });
};