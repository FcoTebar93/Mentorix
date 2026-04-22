import type { FastifyInstance } from "fastify";
import { getDb } from "../../../infrastructure/db/client.js";

export function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health/live", async (_request, reply) => {
    return reply.code(200).send({
      code: "OK",
      status: "live",
    });
  });

  app.get("/health/ready", async (request, reply) => {
    try {
      const db = getDb();
      await db.execute("select 1");

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