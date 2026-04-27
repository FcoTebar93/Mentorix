import { describe, expect, it } from "vitest";
import { auth, buildHttpTestServer } from "./tests/helpers.js";

describe("HTTP voice routes", { timeout: 15000 }, () => {
  it("returns 200 on transcribe with valid body", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/voice/transcribe",
        headers: auth("u1"),
        payload: {
          audioBase64: "U1RVQi1BVURJTw==",
          locale: "es-ES",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().code).toBe("OK");
      expect(typeof res.json().data.text).toBe("string");
    } finally {
      await app.close();
    }
  });

  it("returns 200 on synthesize with valid body", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/voice/synthesize",
        headers: auth("u1"),
        payload: {
          text: "Hola mundo",
          locale: "es-ES",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().code).toBe("OK");
      expect(typeof res.json().data.audioBase64).toBe("string");
      expect(res.json().data.audioBase64.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it("returns 400 on transcribe with invalid body", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/voice/transcribe",
        headers: auth("u1"),
        payload: {
          audioBase64: "",
          locale: "e",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });
});
