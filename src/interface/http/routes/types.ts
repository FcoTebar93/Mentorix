import type { FastifyInstance } from "fastify";
import type { buildContainer } from "../../../infrastructure/container.js";
import type { buildTestContainer } from "../../../infrastructure/test-container.js";

export type AppContainer = ReturnType<typeof buildTestContainer> | ReturnType<typeof buildContainer>;
export type RegisterRoutes = (app: FastifyInstance, container: AppContainer) => void;