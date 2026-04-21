import { z } from "zod";
import type { RegisterRoutes } from "./types.js";
import { mapErrorToHttp } from "../mappers/http-error.js";

const TemplateParamsSchema = z.object({
  templateId: z.string().min(1),
});

const CreateAccessLinkBodySchema = z.object({
  ownerUserId: z.string().min(1),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const registerAccessLinkRoutes: RegisterRoutes = (app, container) => {
  app.post("/v1/templates/:templateId/access-links", async (request, reply) => {
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
      const link = await container.useCases.createAccessLink.execute({
        templateId: parsedParams.data.templateId,
        ...parsedBody.data,
      });

      return reply.code(201).send({ code: "OK", data: link });
    } catch (error) {
      request.log.error({ error }, "create access link failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });
};