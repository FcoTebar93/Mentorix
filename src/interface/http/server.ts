import Fastify from "fastify";
import { buildContainer } from "../../infrastructure/container.js";
import type { AppContainer } from "./routes/types.js";
import { registerRoutes } from "./routes/index.js";

export function buildServer(containerArg?: AppContainer) {
  const app = Fastify({ logger: true });
  const container = containerArg ?? buildContainer();

  registerRoutes(app, container);

  return app;
}