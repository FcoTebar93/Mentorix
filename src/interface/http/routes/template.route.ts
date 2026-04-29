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

const UpdateTemplateBodySchema = CreateTemplateBodySchema.partial().refine(
  (body) => Object.keys(body).length > 0,
  { message: "At least one field must be provided" }
);

const TemplateParamsSchema = z.object({
  templateId: z.string().min(1),
});

export const registerTemplateRoutes: RegisterRoutes = (app, container) => {
  app.get("/v1/templates", { preHandler: requireAuth }, async (request, reply) => {
    try {
      const templates = await container.repositories.templates.listByOwner(request.user!.id);

      return reply.code(200).send({
        code: "OK",
        data: templates.filter((template) => !template.isArchived),
      });
    } catch (error) {
      request.log.error({ error }, "list templates failed");
      const mapped = mapErrorToHttp(error);

      return reply.code(mapped.statusCode).send({
        code: mapped.code,
        message: mapped.message,
      });
    }
  });

  app.get("/v1/templates/:templateId", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = TemplateParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid request params",
        details: parsedParams.error.flatten(),
      });
    }

    try {
      const template = await container.repositories.templates.getByIdForOwner(
        parsedParams.data.templateId,
        request.user!.id
      );

      if (!template || template.isArchived) {
        return reply.code(404).send({
          code: "TEMPLATE_NOT_FOUND",
          message: "Template not found",
        });
      }

      return reply.code(200).send({
        code: "OK",
        data: template,
      });
    } catch (error) {
      request.log.error({ error }, "get template failed");
      const mapped = mapErrorToHttp(error);

      return reply.code(mapped.statusCode).send({
        code: mapped.code,
        message: mapped.message,
      });
    }
  });

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

  app.put("/v1/templates/:templateId", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = TemplateParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid request params",
        details: parsedParams.error.flatten(),
      });
    }

    const parsedBody = UpdateTemplateBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    try {
      const existing = await container.repositories.templates.getByIdForOwner(
        parsedParams.data.templateId,
        request.user!.id
      );

      if (!existing || existing.isArchived) {
        return reply.code(404).send({
          code: "TEMPLATE_NOT_FOUND",
          message: "Template not found",
        });
      }

      const updated = {
        ...existing,
        ...parsedBody.data,
        updatedAt: new Date().toISOString(),
      };

      await container.repositories.templates.save(updated);

      return reply.code(200).send({
        code: "OK",
        data: updated,
      });
    } catch (error) {
      request.log.error({ error }, "update template failed");
      const mapped = mapErrorToHttp(error);

      return reply.code(mapped.statusCode).send({
        code: mapped.code,
        message: mapped.message,
      });
    }
  });

  app.delete("/v1/templates/:templateId", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = TemplateParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid request params",
        details: parsedParams.error.flatten(),
      });
    }

    try {
      const removed = await container.repositories.templates.removeByIdForOwner(
        parsedParams.data.templateId,
        request.user!.id
      );

      if (!removed) {
        return reply.code(404).send({
          code: "TEMPLATE_NOT_FOUND",
          message: "Template not found",
        });
      }

      return reply.code(200).send({
        code: "OK",
        data: { id: parsedParams.data.templateId },
      });
    } catch (error) {
      request.log.error({ error }, "delete template failed");
      const mapped = mapErrorToHttp(error);

      return reply.code(mapped.statusCode).send({
        code: mapped.code,
        message: mapped.message,
      });
    }
  });
};