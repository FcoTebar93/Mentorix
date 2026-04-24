import { describe, expect, it } from "vitest";
import { auth, buildHttpTestServer } from "./tests/helpers.js";

describe("HTTP template routes", { timeout: 15000 }, () => {
  it("returns 400 when create template body is invalid", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: { role: "Backend Engineer" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 201 when creating template", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          ownerUserId: "u1",
          title: "Frontend Interview",
          role: "Frontend Engineer",
          level: "mid",
          language: "es",
          totalQuestions: 5,
          rubric: {
            dimensions: [
              { key: "architecture", weight: 1, description: "System design clarity" },
            ],
            passThreshold: 70,
          },
          llmConfig: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.2,
            maxTokensPerTurn: 600,
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().code).toBe("OK");
      expect(res.json().data.id).toBeTruthy();
    } finally {
      await app.close();
    }
  });
});
