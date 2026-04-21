import { describe, expect, it } from "vitest";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import { buildTestContainer } from "../../infrastructure/test-container.js";
import { buildServer } from "./server.js";

describe("HTTP interview flow", { timeout: 15000 }, () => {
  it("returns 400 when evaluate body is invalid", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s1/evaluate",
        payload: { rubricDimensions: [] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when session does not exist on submit", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/answers",
        payload: { questionId: "q1", source: "text", text: "respuesta" },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when session does not exist on complete", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/complete",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when GET session does not exist", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/unknown",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 when GET session exists", async () => {
    const container = buildTestContainer();

    const seeded: InterviewSessionProps = {
      id: "s-get-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 3,
      questions: [],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    };

    await container.repositories.sessions.save(seeded);
    const app = buildServer(container);

    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/s-get-1",
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().code).toBe("OK");
      expect(res.json().data.id).toBe("s-get-1");
    } finally {
      await app.close();
    }
  });

  it("returns 400 when submit answer body is invalid", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s1/answers",
        payload: { questionId: "", source: "text", text: "" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and transitions session to EVALUATING on valid submit", async () => {
    const container = buildTestContainer();

    await container.repositories.sessions.save({
      id: "s-submit-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 3,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "Explain SOLID principles.",
          generatedByModel: "manual",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    });

    const app = buildServer(container);

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-submit-1/answers",
        payload: {
          questionId: "q1",
          source: "text",
          text: "SOLID improves maintainability.",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(body.data.status).toBe("EVALUATING");
      expect(body.data.answers.length).toBe(1);
    } finally {
      await app.close();
    }
  });

  it("returns 404 when evaluate session does not exist", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/evaluate",
        payload: { rubricDimensions: [{ key: "architecture", weight: 1 }] },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and transitions to FEEDBACKING on valid evaluate", async () => {
    const container = buildTestContainer();

    await container.repositories.sessions.save({
      id: "s-eval-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "EVALUATING",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "Explain clean architecture",
          generatedByModel: "manual",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [
        {
          id: "a1",
          questionId: "q1",
          source: "text",
          text: "Layers + dependency inversion",
          receivedAt: new Date().toISOString(),
        },
      ],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    });

    const app = buildServer(container);

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-eval-1/evaluate",
        payload: { rubricDimensions: [{ key: "architecture", weight: 1 }] },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(body.data.status).toBe("FEEDBACKING");
      expect(body.data.evaluations.length).toBe(1);
    } finally {
      await app.close();
    }
  });

  it("returns 404 when complete session does not exist", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/complete",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and completes session when in FEEDBACKING and last question", async () => {
    const container = buildTestContainer();

    await container.repositories.sessions.save({
      id: "s-complete-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "FEEDBACKING",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [
        {
          id: "q1",
          index: 1,
          text: "Explain DIP",
          generatedByModel: "manual",
          createdAt: new Date().toISOString(),
        },
      ],
      answers: [
        {
          id: "a1",
          questionId: "q1",
          source: "text",
          text: "Depend on abstractions",
          receivedAt: new Date().toISOString(),
        },
      ],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["clear"],
          improvements: ["deeper"],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    });

    const app = buildServer(container);

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-complete-1/complete",
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(body.data.status).toBe("COMPLETED");
    } finally {
      await app.close();
    }
  });

  it("returns 409 when complete is called from invalid state", async () => {
    const container = buildTestContainer();

    await container.repositories.sessions.save({
      id: "s-complete-invalid",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      version: 1,
    });

    const app = buildServer(container);

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-complete-invalid/complete",
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe("INVALID_STATE_TRANSITION");
    } finally {
      await app.close();
    }
  });

  it("returns 400 when create template body is invalid", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
        payload: { ownerUserId: "u1" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 201 when creating template", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
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

  it("returns 400 when create access-link payload is invalid", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates//access-links",
        payload: { ownerUserId: "" },
      });

      expect([400, 404]).toContain(res.statusCode);
    } finally {
      await app.close();
    }
  });

  it("returns 201 when creating access link for existing template", async () => {
    const app = buildServer(buildTestContainer());
    try {
      const templateRes = await app.inject({
        method: "POST",
        url: "/v1/templates",
        payload: {
          ownerUserId: "u1",
          title: "Backend Interview",
          role: "Backend Engineer",
          level: "senior",
          language: "es",
          totalQuestions: 4,
          rubric: {
            dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
            passThreshold: 75,
          },
          llmConfig: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.2,
            maxTokensPerTurn: 700,
          },
        },
      });

      const templateId = templateRes.json().data.id;

      const linkRes = await app.inject({
        method: "POST",
        url: `/v1/templates/${templateId}/access-links`,
        payload: {
          ownerUserId: "u1",
          maxUses: 10,
        },
      });

      expect(linkRes.statusCode).toBe(201);
      expect(linkRes.json().code).toBe("OK");
      expect(linkRes.json().data.id).toBeTruthy();
    } finally {
      await app.close();
    }
  });
});