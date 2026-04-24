import { buildTestContainer } from "../../../infrastructure/test-container.js";
import { buildServer } from "../server.js";

export const auth = (userId: string) => ({
  authorization: `Bearer test-user:${userId}`,
});

export const buildHttpTestServer = () => buildServer(buildTestContainer());
