import { describe, expect, it } from "vitest";
import { auth, buildHttpTestServer } from "./tests/helpers.js";

describe("HTTP access-link routes", { timeout: 15000 }, () => {
  it("returns 400 when create access-link payload is invalid", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates//access-links",
        headers: auth("u1"),
        payload: { maxUses: 10 },
      });

      expect([400, 404]).toContain(res.statusCode);
    } finally {
      await app.close();
    }
  });

  it("returns 201 when creating access link for existing template", async () => {
    const app = buildHttpTestServer();
    try {
      const templateRes = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          templateType: "dynamic",
          title: "Backend Interview",
          role: "Backend Engineer",
          level: "senior",
          language: "es",
          totalQuestions: 4,
          prompt: "Foco en arquitectura backend y trade-offs.",
          rubric: {
            dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
            passThreshold: 75,
          },
        },
      });

      const templateId = templateRes.json().data.id;

      const linkRes = await app.inject({
        method: "POST",
        url: `/v1/templates/${templateId}/access-links`,
        headers: auth("u1"),
        payload: {
          maxUses: 10,
        },
      });

      expect(linkRes.statusCode).toBe(201);
      expect(linkRes.json().code).toBe("OK");
      expect(linkRes.json().data.rawToken).toBeTruthy();
      const rawToken = linkRes.json().data.rawToken;
      await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/from-link",
        headers: auth("u1"),
        payload: { rawToken, guestAlias: "test" },
      });
      expect(linkRes.json().data.tokenHash).toBeUndefined();
    } finally {
      await app.close();
    }
  });
});
