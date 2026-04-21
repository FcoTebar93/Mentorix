import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Clock, IdGenerator, TokenService } from "../../application/ports/services.js";

export class SystemClock implements Clock {
  nowISO(): string {
    return new Date().toISOString();
  }
}

export class SystemIdGenerator implements IdGenerator {
  uuid(): string {
    return randomUUID();
  }
}

export class Sha256TokenService implements TokenService {
  async generateSecureToken(): Promise<string> {
    return randomBytes(32).toString("hex");
  }

  async hash(rawToken: string): Promise<string> {
    return createHash("sha256").update(rawToken).digest("hex");
  }
}