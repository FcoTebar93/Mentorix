import type { RegisterRoutes } from "./types.js";
import { registerSessionRoutes } from "./session.route.js";
import { registerTemplateRoutes } from "./template.route.js";
import { registerAccessLinkRoutes } from "./access-link.route.js";
import { registerHealthRoutes } from "./health.route.js";
import { registerVoiceRoutes } from "./voice.route.js";
import { DbHealthService } from "../../../infrastructure/health/health.service.js";

export const registerRoutes: RegisterRoutes = (app, container) => {
  registerHealthRoutes(app, new DbHealthService());
  registerSessionRoutes(app, container);
  registerTemplateRoutes(app, container);
  registerAccessLinkRoutes(app, container);
  registerVoiceRoutes(app, container);
};