import type { RegisterRoutes } from "./types.js";
import { requireAuth } from "../auth.handler.js";
import { mapErrorToHttp } from "../mappers/http-error.js";
import {
  RealtimeEventsQuerySchema,
  RealtimeInputBodySchema,
  RealtimeNegotiateBodySchema,
  RealtimeSessionParamsSchema,
} from "../schemas/realtime.schema.js";

export const registerRealtimeRoutes: RegisterRoutes = (app, container) => {
  app.post("/v1/realtime/sessions/:sessionId/negotiate", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = RealtimeSessionParamsSchema.safeParse(request.params);
    const parsedBody = RealtimeNegotiateBodySchema.safeParse(request.body);

    if (!parsedParams.success || !parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid realtime negotiation payload",
      });
    }

    try {
      const streamId = parsedBody.data.streamId;
      const negotiation = await container.services.realtimeGateway.negotiate({
        streamId,
        sdpOffer: parsedBody.data.sdpOffer,
        onInputMessage: async (id, payload) => {
          if (!payload || typeof payload !== "object") return;
          const typed = payload as { type?: string; data?: unknown };
          if (typed.type !== "input.submit" || !typed.data || typeof typed.data !== "object") return;
          const data = typed.data as {
            sessionId?: string;
            questionId?: string;
            locale?: string;
            answerAudioBase64?: string;
            answerText?: string;
            rubricDimensions?: Array<{ key: string; weight: number }>;
          };
          if (!data.sessionId || !data.questionId || !data.locale || !Array.isArray(data.rubricDimensions)) {
            container.services.realtimeGateway.send(id, "error", {
              type: "error",
              code: "INVALID_BODY",
              message: "Invalid realtime input payload",
            });
            return;
          }

          try {
            for await (const event of container.useCases.realtimeVoice.execute({
              sessionId: data.sessionId,
              questionId: data.questionId,
              locale: data.locale,
              answerAudioBase64: data.answerAudioBase64,
              answerText: data.answerText,
              rubricDimensions: data.rubricDimensions,
            })) {
              container.services.realtimeGateway.send(id, event.type, event);
            }
            container.services.realtimeGateway.close(id);
          } catch (error) {
            const mapped = mapErrorToHttp(error);
            container.services.realtimeGateway.send(id, "error", {
              type: "error",
              code: mapped.code,
              message: mapped.message,
            });
            container.services.realtimeGateway.close(id);
          }
        },
      });

      return reply.code(200).send({ code: "OK", data: negotiation });
    } catch (error) {
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.get("/v1/realtime/sessions/:sessionId/events", async (request, reply) => {
    const parsedParams = RealtimeSessionParamsSchema.safeParse(request.params);
    const parsedQuery = RealtimeEventsQuerySchema.safeParse(request.query);
    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ code: "INVALID_QUERY", message: "Invalid query params" });
    }

    const { streamId } = parsedQuery.data;
    if (!container.services.realtimeGateway.has(streamId)) {
      return reply.code(404).send({ code: "REALTIME_STREAM_NOT_FOUND", message: "Realtime stream not found" });
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ streamId })}\n\n`);

    const unsubscribe = container.services.realtimeHub.subscribe(streamId, ({ event, data }) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    });

    const keepAlive = setInterval(() => {
      reply.raw.write(`event: heartbeat\ndata: {}\n\n`);
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
      try {
        reply.raw.end();
      } catch {
        // no-op
      }
    });
  });

  app.post("/v1/realtime/sessions/:sessionId/input", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = RealtimeSessionParamsSchema.safeParse(request.params);
    const parsedBody = RealtimeInputBodySchema.safeParse(request.body);
    if (!parsedParams.success || !parsedBody.success) {
      const details = !parsedBody.success
        ? parsedBody.error.flatten()
        : !parsedParams.success
          ? parsedParams.error.flatten()
          : undefined;
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid realtime input payload",
        details,
      });
    }

    if (!container.services.realtimeGateway.has(parsedBody.data.streamId)) {
      return reply.code(404).send({ code: "REALTIME_STREAM_NOT_FOUND", message: "Realtime stream not found" });
    }

    const { streamId } = parsedBody.data;

    void (async () => {
      try {
        for await (const event of container.useCases.realtimeVoice.execute({
          sessionId: parsedParams.data.sessionId,
          questionId: parsedBody.data.questionId,
          locale: parsedBody.data.locale,
          answerAudioBase64: parsedBody.data.answerAudioBase64,
          answerText: parsedBody.data.answerText,
          rubricDimensions: parsedBody.data.rubricDimensions,
        })) {
          container.services.realtimeHub.publish(streamId, event.type, event);
          container.services.realtimeGateway.send(streamId, event.type, event);
        }
      } catch (error) {
        const mapped = mapErrorToHttp(error);
        const payload = { type: "error", code: mapped.code, message: mapped.message };
        container.services.realtimeHub.publish(streamId, "error", payload);
        container.services.realtimeGateway.send(streamId, "error", payload);
      }
    })();

    return reply.code(202).send({ code: "OK", data: { accepted: true, streamId } });
  });
};
