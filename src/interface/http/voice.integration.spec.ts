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

  it("returns 200 with audio when synthesizing existing question", async () => {
    const app = buildHttpTestServer();
    try {
      const templateRes = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          templateType: "question_set",
          title: "TTS demo",
          role: "Backend Engineer",
          level: "mid",
          language: "es",
          questions: ["Explica el principio de inversion de dependencias."],
          rubric: {
            dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
            passThreshold: 70,
          },
        },
      });
      expect(templateRes.statusCode).toBe(201);
      const templateId = templateRes.json().data.id;

      const linkRes = await app.inject({
        method: "POST",
        url: `/v1/templates/${templateId}/access-links`,
        headers: auth("u1"),
        payload: { maxUses: 1 },
      });
      expect(linkRes.statusCode).toBe(201);
      const rawToken = linkRes.json().data.rawToken;

      const startRes = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/from-link",
        headers: auth("u1"),
        payload: { rawToken, guestAlias: "tts-candidate" },
      });
      expect(startRes.statusCode).toBe(201);
      const sessionId = startRes.json().data.id;
      const questionId = startRes.json().data.questions[0].id;

      const ttsRes = await app.inject({
        method: "POST",
        url: "/v1/voice/tts/question",
        headers: auth("u1"),
        payload: { sessionId, questionId },
      });

      expect(ttsRes.statusCode).toBe(200);
      expect(ttsRes.json().code).toBe("OK");
      expect(typeof ttsRes.json().data.audioBase64).toBe("string");
      expect(ttsRes.json().data.audioBase64.length).toBeGreaterThan(0);
      expect(typeof ttsRes.json().data.locale).toBe("string");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when synthesizing for unknown session", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/voice/tts/question",
        headers: auth("u1"),
        payload: { sessionId: "missing-session", questionId: "missing-question" },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 400 on tts/question with invalid body", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/voice/tts/question",
        headers: auth("u1"),
        payload: { sessionId: "" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });
});
