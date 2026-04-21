import "dotenv/config";
import { buildServer } from "./interface/http/server.js";

async function bootstrap() {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`HTTP server running on http://${host}:${port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});