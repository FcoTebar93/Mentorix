import type { DbHealthPort } from "../../application/ports/health.js";
import { getDb } from "../db/client.js";

export class DbHealthService implements DbHealthPort {
  async check(): Promise<void> {
    const db = getDb();
    await db.execute("select 1");
  }
}