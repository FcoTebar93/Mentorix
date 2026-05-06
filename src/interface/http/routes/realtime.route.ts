import type { RegisterRoutes } from "./types.js";
import { requireAuth } from "../auth.handler.js";
import { mapErrorToHttp } from "../mappers/http-error.js";
import {
  RealtimeEventsQuerySchema,
  RealtimeInputAudioChunkMessageSchema,
  RealtimeInputEndMessageSchema,
  RealtimeInputBodySchema,
  RealtimeInputStartMessageSchema,
  RealtimeNegotiateBodySchema,
  RealtimeSessionParamsSchema,
} from "../schemas/realtime.schema.js";

export const registerRealtimeRoutes: RegisterRoutes = (app, container) => {
  const streamTurnState = new Map<
    string,
    {
      sessionId: string;
      questionId: string;
      locale: string;
      rubricDimensions: Array<{ key: string; weight: number }>;
      audioChunks: string[];
    }
  >();

  const executeRealtimeTurn = async (input: {
    streamId: string;
    sessionId: string;
    questionId: string;
    locale: string;
    rubricDimensions: Array<{ key: string; weight: number }>;
    answerAudioBase64?: string;
    answerText?: string;
    closeWhenDone?: boolean;
  }) => {
    try {
      for await (const event of container.useCases.realtimeVoice.execute({
        sessionId: input.sessionId,
        questionId: input.questionId,
        locale: input.locale,
        answerAudioBase64: input.answerAudioBase64,
        answerText: input.answerText,
        rubricDimensions: input.rubricDimensions,
      })) {
        container.services.realtimeHub.publish(input.streamId, event.type, event);
        container.services.realtimeGateway.send(input.streamId, event.type, event);
      }
      if (input.closeWhenDone) container.services.realtimeGateway.close(input.streamId);
    } catch (error) {
      const mapped = mapErrorToHttp(error);
      const payload = { type: "error", code: mapped.code, message: mapped.message };
      container.services.realtimeHub.publish(input.streamId, "error", payload);
      container.services.realtimeGateway.send(input.streamId, "error", payload);
      if (input.closeWhenDone) container.services.realtimeGateway.close(input.streamId);
    }
  };

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
        sessionId: parsedParams.data.sessionId,
        sdpOffer: parsedBody.data.sdpOffer,
        onInputMessage: async (id, payload) => {
          if (!payload || typeof payload !== "object") return;
          const startMessage = RealtimeInputStartMessageSchema.safeParse(payload);
          if (startMessage.success) {
            if (startMessage.data.data.sessionId !== parsedParams.data.sessionId) {
              container.services.realtimeGateway.send(id, "error", {
                type: "error",
                code: "REALTIME_SESSION_MISMATCH",
                message: "Session mismatch for realtime stream",
              });
              container.services.realtimeGateway.close(id);
              return;
            }
            streamTurnState.set(id, {
              sessionId: startMessage.data.data.sessionId,
              questionId: startMessage.data.data.questionId,
              locale: startMessage.data.data.locale,
              rubricDimensions: startMessage.data.data.rubricDimensions,
              audioChunks: [],
            });
            container.services.realtimeGateway.send(id, "input_started", {
              type: "input_started",
              streamId: id,
            });
            return;
          }

          const chunkMessage = RealtimeInputAudioChunkMessageSchema.safeParse(payload);
          if (chunkMessage.success) {
            const current = streamTurnState.get(id);
            if (!current) {
              container.services.realtimeGateway.send(id, "error", {
                type: "error",
                code: "REALTIME_INPUT_NOT_STARTED",
                message: "Call input.start before sending audio chunks",
              });
              return;
            }
            current.audioChunks.push(chunkMessage.data.data.audioBase64Chunk);
            return;
          }

          const endMessage = RealtimeInputEndMessageSchema.safeParse(payload);
          if (endMessage.success) {
            const current = streamTurnState.get(id);
            if (!current) {
              container.services.realtimeGateway.send(id, "error", {
                type: "error",
                code: "REALTIME_INPUT_NOT_STARTED",
                message: "Call input.start before input.end",
              });
              return;
            }
            const answerAudioBase64 = current.audioChunks.join("");
            streamTurnState.delete(id);
            await executeRealtimeTurn({
              streamId: id,
              sessionId: current.sessionId,
              questionId: current.questionId,
              locale: current.locale,
              rubricDimensions: current.rubricDimensions,
              answerAudioBase64,
              closeWhenDone: true,
            });
            return;
          }

          const typed = payload as { type?: string };
          if (typed.type !== "input.submit") {
            container.services.realtimeGateway.send(id, "error", {
              type: "error",
              code: "INVALID_REALTIME_EVENT",
              message: "Unsupported realtime event type",
            });
            return;
          }

          // Backward-compatible fallback for old clients.
          const legacy = RealtimeInputBodySchema.safeParse((payload as { data?: unknown }).data);
          if (!legacy.success) {
            container.services.realtimeGateway.send(id, "error", {
              type: "error",
              code: "INVALID_BODY",
              message: "Invalid realtime input payload",
            });
            return;
          }
          await executeRealtimeTurn({
            streamId: id,
            sessionId: parsedParams.data.sessionId,
            questionId: legacy.data.questionId,
            locale: legacy.data.locale,
            rubricDimensions: legacy.data.rubricDimensions,
            answerAudioBase64: legacy.data.answerAudioBase64,
            answerText: legacy.data.answerText,
            closeWhenDone: true,
          });
        },
      });

      return reply.code(200).send({ code: "OK", data: negotiation });
    } catch (error) {
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.get("/v1/realtime/sessions/:sessionId/events", { preHandler: requireAuth }, async (request, reply) => {
    const parsedParams = RealtimeSessionParamsSchema.safeParse(request.params);
    const parsedQuery = RealtimeEventsQuerySchema.safeParse(request.query);
    if (!parsedParams.success || !parsedQuery.success) {
      return reply.code(400).send({ code: "INVALID_QUERY", message: "Invalid query params" });
    }

    const { streamId } = parsedQuery.data;
    if (!container.services.realtimeGateway.has(streamId) || !container.services.realtimeGateway.matchesSession(streamId, parsedParams.data.sessionId)) {
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

    if (
      !container.services.realtimeGateway.has(parsedBody.data.streamId) ||
      !container.services.realtimeGateway.matchesSession(parsedBody.data.streamId, parsedParams.data.sessionId)
    ) {
      return reply.code(404).send({ code: "REALTIME_STREAM_NOT_FOUND", message: "Realtime stream not found" });
    }

    const { streamId } = parsedBody.data;

    void (async () => {
      await executeRealtimeTurn({
        streamId,
        sessionId: parsedParams.data.sessionId,
        questionId: parsedBody.data.questionId,
        locale: parsedBody.data.locale,
        answerAudioBase64: parsedBody.data.answerAudioBase64,
        answerText: parsedBody.data.answerText,
        rubricDimensions: parsedBody.data.rubricDimensions,
      });
    })();

    return reply.code(202).send({ code: "OK", data: { accepted: true, streamId } });
  });
};
