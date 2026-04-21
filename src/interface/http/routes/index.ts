import type { RegisterRoutes } from "./types.js";
import { registerSessionRoutes } from "./session.route.js";

export const registerRoutes: RegisterRoutes = (app, container) => {
  registerSessionRoutes(app, container);
};