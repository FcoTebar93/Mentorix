import { z } from "zod";
import type { RegisterRoutes } from "./types.js";
import { mapErrorToHttp } from "../mappers/http-error.js";
import { requireAuth } from "../auth.handler.js";

const TemplateParamsSchema = z.object({
  templateId: z.string().min(1),
});
const AccessLinkParamsSchema = z.object({
  linkId: z.string().min(1),
});

const CreateAccessLinkBodySchema = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const registerAccessLinkRoutes: RegisterRoutes = (app, container) => {
  app.post("/v1/templates/:templateId/access-links", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = TemplateParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    const parsedBody = CreateAccessLinkBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    try {
      const result = await container.useCases.createAccessLink.execute({
        templateId: parsedParams.data.templateId,
        ownerUserId: request.user!.id,
        maxUses: parsedBody.data.maxUses,
        expiresAt: parsedBody.data.expiresAt,
      });

      return reply.code(201).send({
        code: "OK",
        data: {
          id: result.link.id,
          templateId: result.link.templateId,
          ownerUserId: result.link.ownerUserId,
          status: result.link.status,
          maxUses: result.link.maxUses,
          usedCount: result.link.usedCount,
          expiresAt: result.link.expiresAt,
          createdAt: result.link.createdAt,
          rawToken: result.rawToken,
        },
      });
    } catch (error) {
      request.log.error({ error }, "create access link failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.get("/v1/templates/:templateId/access-links", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = TemplateParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    try {
      const links = await container.useCases.listAccessLinks.execute({
        templateId: parsedParams.data.templateId,
        ownerUserId: request.user!.id,
      });

      return reply.code(200).send({
        code: "OK",
        data: links.map((link) => ({
          id: link.id,
          templateId: link.templateId,
          ownerUserId: link.ownerUserId,
          status: link.status,
          maxUses: link.maxUses,
          usedCount: link.usedCount,
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
          revokedAt: link.revokedAt,
        })),
      });
    } catch (error) {
      request.log.error({ error }, "list access links failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.post("/v1/access-links/:linkId/revoke", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = AccessLinkParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    try {
      const link = await container.useCases.revokeAccessLink.execute({
        linkId: parsedParams.data.linkId,
        ownerUserId: request.user!.id,
      });

      return reply.code(200).send({
        code: "OK",
        data: {
          id: link.id,
          templateId: link.templateId,
          ownerUserId: link.ownerUserId,
          status: link.status,
          maxUses: link.maxUses,
          usedCount: link.usedCount,
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
          revokedAt: link.revokedAt,
        },
      });
    } catch (error) {
      request.log.error({ error }, "revoke access link failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });
};