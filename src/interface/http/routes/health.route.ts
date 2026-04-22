import type { FastifyInstance } from "fastify";
import type { DbHealthPort } from "../../../application/ports/health.js";

export function registerHealthRoutes(app: FastifyInstance, dbHealth: DbHealthPort) {
  app.get("/health/live", async (_request, reply) => {
    return reply.code(200).send({
      code: "OK",
      status: "live",
    });
  });

  app.get("/health/ready", async (request, reply) => {
    try {
      await dbHealth.check();

      return reply.code(200).send({
        code: "OK",
        status: "ready",
      });
    } catch (error) {
      request.log.error({ error }, "readiness check failed");
      return reply.code(503).send({
        code: "NOT_READY",
        status: "not_ready",
      });
    }
  });
}