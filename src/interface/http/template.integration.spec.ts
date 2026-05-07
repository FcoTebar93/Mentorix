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

  it("returns 201 when creating dynamic template", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          templateType: "dynamic",
          title: "Frontend Interview",
          role: "Frontend Engineer",
          level: "mid",
          language: "es",
          totalQuestions: 5,
          prompt: "Foco en arquitectura de componentes y rendimiento.",
          rubric: {
            dimensions: [
              { key: "architecture", weight: 1, description: "System design clarity" },
            ],
            passThreshold: 70,
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().code).toBe("OK");
      expect(res.json().data.id).toBeTruthy();
      expect(res.json().data.templateType).toBe("dynamic");
    } finally {
      await app.close();
    }
  });

  it("returns 201 when creating question_set template", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          templateType: "question_set",
          title: "Backend QSet",
          role: "Backend Engineer",
          level: "senior",
          language: "es",
          questions: [
            "Explica dependency inversion con un ejemplo.",
            "Como disenarias un rate limiter distribuido?",
          ],
          rubric: {
            dimensions: [
              { key: "architecture", weight: 1, description: "System design clarity" },
            ],
            passThreshold: 70,
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().code).toBe("OK");
      expect(res.json().data.templateType).toBe("question_set");
      expect(res.json().data.totalQuestions).toBe(2);
    } finally {
      await app.close();
    }
  });
});
