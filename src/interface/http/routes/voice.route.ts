import type { RegisterRoutes } from "./types.js";
import { requireAuth } from "../auth.handler.js";
import { mapErrorToHttp } from "../mappers/http-error.js";
import { SynthesizeBodySchema, TranscribeBodySchema, TtsQuestionBodySchema } from "../schemas/voice.schema.js";

export const registerVoiceRoutes: RegisterRoutes = (app, container) => {
  app.post("/v1/voice/transcribe", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = TranscribeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const result = await container.services.sttService.transcribe(parsed.data);
      return reply.code(200).send({ code: "OK", data: result });
    } catch (error) {
      request.log.error({ error }, "voice transcribe failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.post("/v1/voice/synthesize", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = SynthesizeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const result = await container.services.ttsService.synthesize(parsed.data);
      return reply.code(200).send({ code: "OK", data: result });
    } catch (error) {
      request.log.error({ error }, "voice synthesize failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });

  app.post("/v1/voice/tts/question", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = TtsQuestionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const result = await container.useCases.synthesizeQuestionAudio.execute({
        sessionId: parsed.data.sessionId,
        questionId: parsed.data.questionId,
      });
      return reply.code(200).send({ code: "OK", data: result });
    } catch (error) {
      request.log.error({ error }, "tts question failed");
      const mapped = mapErrorToHttp(error);
      return reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    }
  });
};
