import Fastify from "fastify";
import { z } from "zod";
import { buildContainer } from "../../infrastructure/container.js";

const EvaluateParamsSchema = z.object({
  sessionId: z.string().min(1),
});

const EvaluateBodySchema = z.object({
  rubricDimensions: z
    .array(
      z.object({
        key: z.string().min(1),
        weight: z.number().positive(),
      })
    )
    .min(1),
});

const StartFromLinkBodySchema = z.object({
    rawToken: z.string().min(1),
    guestAlias: z.string().optional(),
    fingerprintHash: z.string().optional(),
});
  
const SubmitAnswerParamsSchema = z.object({
    sessionId: z.string().min(1),
});
  
const SubmitAnswerBodySchema = z.object({
    questionId: z.string().min(1),
    source: z.enum(["voice", "text"]),
    text: z.string().min(1),
});
  
const CompleteParamsSchema = z.object({
    sessionId: z.string().min(1),
});

export function buildServer() {
  const app = Fastify({ logger: true });
  const container = buildContainer();

  app.post("/v1/interview-sessions/:sessionId/evaluate", async (request, reply) => {
    const parsedParams = EvaluateParamsSchema.safeParse(request.params);
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

      return reply.code(200).send({
        code: "OK",
        data: session,
      });
    } catch (error) {
      request.log.error({ error }, "evaluate endpoint failed");

      if (error instanceof Error) {
        if (error.message === "SESSION_NOT_FOUND") {
          return reply.code(404).send({ code: "SESSION_NOT_FOUND", message: "Session not found" });
        }
        if (error.message === "RUBRIC_DIMENSIONS_REQUIRED") {
          return reply.code(400).send({
            code: "RUBRIC_DIMENSIONS_REQUIRED",
            message: "Rubric dimensions are required",
          });
        }
        if (error.message === "QUESTION_OR_ANSWER_MISSING") {
          return reply.code(409).send({
            code: "QUESTION_OR_ANSWER_MISSING",
            message: "Session has no question/answer to evaluate",
          });
        }
        if (error.message === "LLM_EVALUATION_FAILED") {
          return reply.code(502).send({
            code: "LLM_EVALUATION_FAILED",
            message: "LLM provider evaluation failed",
          });
        }
      }

      return reply.code(500).send({
        code: "INTERNAL_ERROR",
        message: "Unexpected server error",
      });
    }
  });

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
  
      if (error instanceof Error) {
        if (error.message === "ACCESS_LINK_NOT_FOUND") {
          return reply.code(404).send({ code: error.message, message: "Access link not found" });
        }
        if (
          error.message === "ACCESS_LINK_NOT_ACTIVE" ||
          error.message === "ACCESS_LINK_EXPIRED" ||
          error.message === "ACCESS_LINK_MAX_USES_REACHED"
        ) {
          return reply.code(410).send({ code: error.message, message: "Access link not valid" });
        }
        if (error.message === "TEMPLATE_NOT_FOUND") {
          return reply.code(404).send({ code: error.message, message: "Template not found" });
        }
      }
  
      return reply.code(500).send({ code: "INTERNAL_ERROR", message: "Unexpected server error" });
    }
  });

  app.post("/v1/interview-sessions/:sessionId/answers", async (request, reply) => {
    const parsedParams = SubmitAnswerParamsSchema.safeParse(request.params);
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
  
      if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
        return reply.code(404).send({ code: "SESSION_NOT_FOUND", message: "Session not found" });
      }
  
      return reply.code(500).send({ code: "INTERNAL_ERROR", message: "Unexpected server error" });
    }
  });

  app.post("/v1/interview-sessions/:sessionId/complete", async (request, reply) => {
    const parsedParams = CompleteParamsSchema.safeParse(request.params);
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
  
      if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
        return reply.code(404).send({ code: "SESSION_NOT_FOUND", message: "Session not found" });
      }
  
      return reply.code(500).send({ code: "INTERNAL_ERROR", message: "Unexpected server error" });
    }
  });

  return app;
}