import { z } from "zod";
import type { RegisterRoutes } from "./types.js";
import { mapErrorToHttp } from "../mappers/http-error.js";
import { requireAuth } from "../auth.handler.js";

const LlmProviderSchema = z.enum([
  "openai",
  "groq",
  "anthropic",
  "google",
  "azure",
  "ollama",
  "custom",
  "mock",
]);

const BaseTemplateSchema = z.object({
  title: z.string().min(1),
  role: z.string().min(1),
  level: z.enum(["junior", "mid", "senior"]),
  language: z.string().min(2),
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
  voiceConfig: z
    .object({
      sttProvider: z.string().min(1),
      ttsProvider: z.string().min(1),
      locale: z.string().min(2),
    })
    .optional(),
});

const DynamicTemplateBodySchema = BaseTemplateSchema.extend({
  templateType: z.literal("dynamic"),
  prompt: z.string().min(1),
  totalQuestions: z.number().int().positive(),
});

const QuestionSetTemplateBodySchema = BaseTemplateSchema.extend({
  templateType: z.literal("question_set"),
  questions: z.array(z.string().min(1)).min(1),
});

const CreateTemplateBodySchema = z.discriminatedUnion("templateType", [
  DynamicTemplateBodySchema,
  QuestionSetTemplateBodySchema,
]);

const UpdateTemplateBodySchema = BaseTemplateSchema.extend({
  templateType: z.enum(["dynamic", "question_set"]).optional(),
  prompt: z.string().min(1).optional(),
  totalQuestions: z.number().int().positive().optional(),
  questions: z.array(z.string().min(1)).min(1).optional(),
}).partial().refine(
  (body) => Object.keys(body).length > 0,
  { message: "At least one field must be provided" }
);

const TemplateParamsSchema = z.object({
  templateId: z.string().min(1),
});

export const registerTemplateRoutes: RegisterRoutes = (app, container) => {
  const llmConfigFromEnv = {
    provider: LlmProviderSchema.parse((process.env.LLM_PROVIDER ?? "openai").toLowerCase()),
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    temperature: Number(process.env.LLM_TEMPERATURE ?? "0.2"),
    maxTokensPerTurn: Number(process.env.LLM_MAX_TOKENS ?? "700"),
  };

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
        templateType: parsedBody.data.templateType,
        title: parsedBody.data.title,
        role: parsedBody.data.role,
        level: parsedBody.data.level,
        language: parsedBody.data.language,
        totalQuestions:
          parsedBody.data.templateType === "question_set"
            ? parsedBody.data.questions.length
            : parsedBody.data.totalQuestions,
        prompt: parsedBody.data.templateType === "dynamic" ? parsedBody.data.prompt : "",
        questions:
          parsedBody.data.templateType === "question_set" ? parsedBody.data.questions : [],
        rubric: parsedBody.data.rubric,
        llmConfig: llmConfigFromEnv,
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

      const nextTemplateType = parsedBody.data.templateType ?? existing.templateType;
      const nextQuestions =
        nextTemplateType === "question_set"
          ? parsedBody.data.questions ?? existing.questions ?? []
          : [];
      const nextPrompt =
        nextTemplateType === "dynamic"
          ? parsedBody.data.prompt ?? existing.prompt ?? ""
          : "";
      const nextTotalQuestions =
        nextTemplateType === "question_set"
          ? nextQuestions.length
          : parsedBody.data.totalQuestions ?? existing.totalQuestions;

      const updated = {
        ...existing,
        ...parsedBody.data,
        templateType: nextTemplateType,
        prompt: nextPrompt,
        questions: nextQuestions,
        totalQuestions: nextTotalQuestions,
        llmConfig: llmConfigFromEnv,
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