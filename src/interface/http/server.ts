import Fastify from "fastify";
import cors from "@fastify/cors";
import { buildContainer } from "../../infrastructure/container.js";
import type { AppContainer } from "./routes/types.js";
import { registerRoutes } from "./routes/index.js";

export function buildServer(containerArg?: AppContainer) {
  const app = Fastify({ logger: true });
  const container = containerArg ?? buildContainer();
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  registerRoutes(app, container);

  return app;
}