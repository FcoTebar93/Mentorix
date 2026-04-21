import type { RegisterRoutes } from "./types.js";
import { registerSessionRoutes } from "./session.route.js";
import { registerTemplateRoutes } from "./template.route.js";
import { registerAccessLinkRoutes } from "./access-link.route.js";

export const registerRoutes: RegisterRoutes = (app, container) => {
  registerSessionRoutes(app, container);
  registerTemplateRoutes(app, container);
  registerAccessLinkRoutes(app, container);
};