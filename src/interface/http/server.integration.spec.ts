import { describe, expect, it } from "vitest";
import { buildTestContainer } from "../../infrastructure/test-container.js";
import { buildServer } from "./server.js";
import { auth } from "./tests/helpers.js";

const buildContainer = buildTestContainer;

describe("HTTP interview flow", { timeout: 15000 }, () => {
  it("E2E: authenticated owner creates template/link, guest starts session, completes turn, and owner gets report", async () => {
    const app = buildServer(buildContainer());
  
    try {
      const templateRes = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          title: "E2E Backend Interview",
          role: "Backend Engineer",
          level: "mid",
          language: "es",
          totalQuestions: 1,
          rubric: {
            dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
            passThreshold: 70,
          },
          llmConfig: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.2,
            maxTokensPerTurn: 700,
          },
        },
      });
  
      expect(templateRes.statusCode).toBe(201);
      const templateId = templateRes.json().data.id as string;
  
      const linkRes = await app.inject({
        method: "POST",
        url: `/v1/templates/${templateId}/access-links`,
        headers: auth("u1"),
        payload: { maxUses: 1 },
      });
  
      expect(linkRes.statusCode).toBe(201);
      expect(linkRes.json().data.tokenHash).toBeUndefined();
  
      const rawToken = linkRes.json().data.rawToken as string;
      expect(rawToken).toBeTruthy();
  
      const startRes = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/from-link",
        headers: auth("u1"),
        payload: { rawToken, guestAlias: "candidate-e2e" },
      });
  
      expect(startRes.statusCode).toBe(201);
      const session = startRes.json().data as {
        id: string;
        questions: Array<{ id: string }>;
        status: string;
      };
  
      expect(session.status).toBe("ASKING");
      expect(session.questions.length).toBeGreaterThan(0);
  
      const sessionId = session.id;
      const questionId = session.questions[0].id;
  
      const turnRes = await app.inject({
        method: "POST",
        url: `/v1/interview-sessions/${sessionId}/turn`,
        headers: auth("u1"),
        payload: {
          questionId,
          source: "text",
          text: "Respuesta de prueba E2E",
          rubricDimensions: [{ key: "architecture", weight: 1 }],
        },
      });
  
      expect(turnRes.statusCode).toBe(200);
      expect(turnRes.json().code).toBe("OK");
      expect(turnRes.json().data.latestEvaluation).toBeTruthy();
      expect(turnRes.json().data.latestFeedback).toBeTruthy();
      expect(turnRes.json().data.isCompleted).toBe(true);
  
      const reportRes = await app.inject({
        method: "GET",
        url: `/v1/interview-sessions/${sessionId}/report`,
        headers: auth("u1"),
      });
  
      expect(reportRes.statusCode).toBe(200);
      expect(reportRes.json().code).toBe("OK");
      expect(reportRes.json().data.sessionId).toBe(sessionId);
      expect(reportRes.json().data.evaluatedAnswers).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

});