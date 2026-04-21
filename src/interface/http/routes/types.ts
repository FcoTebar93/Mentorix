import type { FastifyInstance } from "fastify";
import type { buildContainer } from "../../../infrastructure/container.js";

export type AppContainer = ReturnType<typeof buildContainer>;
export type RegisterRoutes = (app: FastifyInstance, container: AppContainer) => void;