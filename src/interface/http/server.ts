import Fastify from "fastify";
import { buildContainer } from "../../infrastructure/container.js";
import { registerRoutes } from "./routes/index.js";

export function buildServer(containerArg?: ReturnType<typeof buildContainer>) {
  const app = Fastify({ logger: true });
  const container = containerArg ?? buildContainer();

  registerRoutes(app, container);

  return app;
}