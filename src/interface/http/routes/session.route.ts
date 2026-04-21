import type { RegisterRoutes } from "./types.js";
import {
  EvaluateBodySchema,
  SessionParamsSchema,
  StartFromLinkBodySchema,
  SubmitAnswerBodySchema,
} from "../schemas/session.schema.js";
import { mapErrorToHttp } from "../mappers/http-error.js";

export const registerSessionRoutes: RegisterRoutes = (app, container) => {
  app.post("/v1/interview-sessions/from-link", async (request, reply) => {
    const parsedBody = StartFromLinkBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    try {
      const session = await container.useCases.startSession.execute(parsedBody.data);
      return reply.code(201).send({ code: "OK", data: session });
    } catch (error) {
      request.log.error({ error }, "start from link failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.get("/v1/interview-sessions/:sessionId", async (request, reply) => {
    const parsedParams = SessionParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    try {
      const session = await container.repositories.sessions.getById(parsedParams.data.sessionId);
      if (!session) {
        return reply.code(404).send({
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        });
      }
      return reply.code(200).send({ code: "OK", data: session });
    } catch (error) {
      request.log.error({ error }, "get session failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.post("/v1/interview-sessions/:sessionId/answers", async (request, reply) => {
    const parsedParams = SessionParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    const parsedBody = SubmitAnswerBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    try {
      const session = await container.useCases.submitAnswer.execute({
        sessionId: parsedParams.data.sessionId,
        questionId: parsedBody.data.questionId,
        source: parsedBody.data.source,
        text: parsedBody.data.text,
      });

      return reply.code(200).send({ code: "OK", data: session });
    } catch (error) {
      request.log.error({ error }, "submit answer failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.post("/v1/interview-sessions/:sessionId/evaluate", async (request, reply) => {
    const parsedParams = SessionParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    const parsedBody = EvaluateBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    try {
      const session = await container.useCases.evaluateAnswer.execute({
        sessionId: parsedParams.data.sessionId,
        rubricDimensions: parsedBody.data.rubricDimensions,
      });

      return reply.code(200).send({ code: "OK", data: session });
    } catch (error) {
      request.log.error({ error }, "evaluate endpoint failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.post("/v1/interview-sessions/:sessionId/complete", async (request, reply) => {
    const parsedParams = SessionParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({
        code: "INVALID_PARAMS",
        message: "Invalid route params",
        details: parsedParams.error.flatten(),
      });
    }

    try {
      const session = await container.useCases.completeSession.execute({
        sessionId: parsedParams.data.sessionId,
      });

      return reply.code(200).send({ code: "OK", data: session });
    } catch (error) {
      request.log.error({ error }, "complete session failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });
};