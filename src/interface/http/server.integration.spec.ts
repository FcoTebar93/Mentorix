import { describe, expect, it } from "vitest";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import { buildTestContainer } from "../../infrastructure/test-container.js";
import { buildServer } from "./server.js";
import { auth } from "./tests/helpers.js";

const buildContainer = buildTestContainer;

describe("HTTP interview flow", { timeout: 15000 }, () => {
  it("returns 400 when evaluate body is invalid", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s1/evaluate",
        headers: auth("u1"),
        payload: { rubricDimensions: [] },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when session does not exist on submit", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/answers",
        headers: auth("u1"),
        payload: { questionId: "q1", source: "text", text: "respuesta" },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when session does not exist on complete", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/complete",
        headers: auth("u1"),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when GET session does not exist", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/unknown",
        headers: auth("u1"),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 when GET session exists", async () => {
    const container = buildContainer();

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
        headers: auth("u1"),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().code).toBe("OK");
      expect(res.json().data.id).toBe("s-get-1");
    } finally {
      await app.close();
    }
  });

  it("returns 400 when submit answer body is invalid", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s1/answers",
        headers: auth("u1"),
        payload: { questionId: "", source: "text", text: "" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and transitions session to EVALUATING on valid submit", async () => {
    const container = buildContainer();

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
        headers: auth("u1"),
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
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/evaluate",
        headers: auth("u1"),
        payload: { rubricDimensions: [{ key: "architecture", weight: 1 }] },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and transitions to FEEDBACKING on valid evaluate", async () => {
    const container = buildContainer();

    await container.repositories.templates.save({
      id: "t1",
      ownerUserId: "u1",
      title: "Template test",
      role: "Backend Engineer",
      level: "mid",
      language: "es",
      totalQuestions: 1,
      rubric: {
        dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
        passThreshold: 70,
      },
      llmConfig: {
        provider: "mock",
        model: "mock-model-v1",
        temperature: 0.2,
        maxTokensPerTurn: 700,
      },
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

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
        headers: auth("u1"),
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
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/unknown/complete",
        headers: auth("u1"),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and completes session when in FEEDBACKING and last question", async () => {
    const container = buildContainer();

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
        headers: auth("u1"),
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
    const container = buildContainer();

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
        headers: auth("u1"),
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().code).toBe("INVALID_STATE_TRANSITION");
    } finally {
      await app.close();
    }
  });

  it("returns 400 when create template body is invalid", async () => {
    const app = buildServer(buildContainer());
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
    const app = buildServer(buildContainer());
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

  it("returns 400 when create access-link payload is invalid", async () => {
    const app = buildServer(buildContainer());
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
    const app = buildServer(buildContainer());
    try {
      const templateRes = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
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
        headers: auth("u1"),
        payload: {
          maxUses: 10,
        },
      });

      expect(linkRes.statusCode).toBe(201);
      expect(linkRes.json().code).toBe("OK");
      expect(linkRes.json().data.rawToken).toBeTruthy();
      const rawToken = linkRes.json().data.rawToken;
      const startRes = await app.inject({
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

  it("returns 200 and lists sessions", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-list-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "a" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
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
        method: "GET",
        url: "/v1/interview-sessions",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  it("returns 200 and filters sessions by status", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-list-2",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "a" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    await container.repositories.sessions.save({
      id: "s-list-3",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "b" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
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
        method: "GET",
        url: "/v1/interview-sessions?status=COMPLETED",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data.every((s: { status: string }) => s.status === "COMPLETED")).toBe(true);
    } finally {
      await app.close();
    }
  });

  it("returns 400 when list sessions query is invalid", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions?limit=0",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_QUERY");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when session report does not exist", async () => {
    const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/unknown/report",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 with computed session report", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-report-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["claridad"],
          improvements: ["profundidad"],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
        {
          id: "e2",
          answerId: "a2",
          score: 90,
          dimensionScores: { architecture: 90 },
          strengths: ["estructura"],
          improvements: ["más ejemplos"],
          confidence: 0.92,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    const app = buildServer(container);
  
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/s-report-1/report",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
  
      expect(body.code).toBe("OK");
      expect(body.data.sessionId).toBe("s-report-1");
      expect(body.data.status).toBe("COMPLETED");
      expect(body.data.overallScore).toBe(85);
      expect(body.data.evaluatedAnswers).toBe(2);
      expect(body.data.strengths).toEqual(expect.arrayContaining(["claridad", "estructura"]));
      expect(body.data.improvements).toEqual(
        expect.arrayContaining(["profundidad", "más ejemplos"])
      );
    } finally {
      await app.close();
    }
  });

  it("GET /v1/interview-sessions/:id/report calcula dimensionAverages y confidenceAverage", async () => {
    const container = buildContainer();
    const sessionId = "s-report-2";
  
    await container.repositories.sessions.save({
      id: sessionId,
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 70,
          dimensionScores: { communication: 60, problemSolving: 80 },
          confidence: 0.8,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
        {
          id: "e2",
          answerId: "a2",
          score: 90,
          dimensionScores: { communication: 80, problemSolving: 100 },
          confidence: 0.6,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    const app = buildServer(container);
  
    try {
      const reportRes = await app.inject({
        method: "GET",
        url: `/v1/interview-sessions/${sessionId}/report`,
        headers: auth("u1"),
      });
  
      expect(reportRes.statusCode).toBe(200);
      const body = reportRes.json();
  
      expect(body.code).toBe("OK");
      expect(body.data.dimensionAverages).toEqual({
        communication: 70,
        problemSolving: 90,
      });
      expect(body.data.confidenceAverage).toBe(0.7);
    } finally {
      await app.close();
    }
  });

  it("GET /v1/interview-sessions/:id/report incluye recommendation según overallScore", async () => {
    const container = buildContainer();
    const sessionId = "s-report-3";
  
    await container.repositories.sessions.save({
      id: sessionId,
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 60,
          dimensionScores: { communication: 60 },
          confidence: 0.7,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
        {
          id: "e2",
          answerId: "a2",
          score: 70,
          dimensionScores: { communication: 70 },
          confidence: 0.6,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    const app = buildServer(container);
  
    try {
      const res = await app.inject({
        method: "GET",
        url: `/v1/interview-sessions/${sessionId}/report`,
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
  
      expect(body.code).toBe("OK");
      expect(body.data.overallScore).toBe(65);
      expect(body.data.recommendation).toBe(
        "Recomendado con reservas: revisar dimensiones con menor puntaje."
      );
    } finally {
      await app.close();
    }
  });

  it("returns 200 and lists session reports with trafficLight", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-list-r-green",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "g1" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 85,
          dimensionScores: { architecture: 85 },
          confidence: 0.9,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    await container.repositories.sessions.save({
      id: "s-list-r-yellow",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "g2" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e2",
          answerId: "a2",
          score: 65,
          dimensionScores: { architecture: 65 },
          confidence: 0.7,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    await container.repositories.sessions.save({
      id: "s-list-r-red",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "g3" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e3",
          answerId: "a3",
          score: 45,
          dimensionScores: { architecture: 45 },
          confidence: 0.5,
          strengths: [],
          improvements: [],
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    await container.repositories.sessions.save({
      id: "s-list-r-gray",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "g4" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
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
        method: "GET",
        url: "/v1/interview-sessions/reports",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      type ReportListItem = {
        sessionId: string;
        trafficLight: "GREEN" | "YELLOW" | "RED" | "GRAY";
      };

      const body = res.json<{ code: string; data: ReportListItem[] }>();
      expect(body.code).toBe("OK");
      expect(Array.isArray(body.data)).toBe(true);
      
      const byId = new Map<string, ReportListItem>(
        body.data.map((item) => [item.sessionId, item] as const)
      );
  
      expect(byId.get("s-list-r-green")?.trafficLight).toBe("GREEN");
      expect(byId.get("s-list-r-yellow")?.trafficLight).toBe("YELLOW");
      expect(byId.get("s-list-r-red")?.trafficLight).toBe("RED");
      expect(byId.get("s-list-r-gray")?.trafficLight).toBe("GRAY");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and filters session reports by status", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-report-filter-completed",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "a" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 2,
      totalQuestions: 2,
      questions: [],
      answers: [],
      evaluations: [],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    await container.repositories.sessions.save({
      id: "s-report-filter-asking",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "b" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
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
        method: "GET",
        url: "/v1/interview-sessions/reports?status=COMPLETED",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
  
      expect(body.code).toBe("OK");
      expect(body.data.length).toBe(1);
      expect(body.data[0].sessionId).toBe("s-report-filter-completed");
      expect(body.data[0].status).toBe("COMPLETED");
    } finally {
      await app.close();
    }
  });

  it("returns 400 when list session reports query is invalid", async () => {
    const app = buildServer(buildContainer());
  
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/reports?limit=0",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_QUERY");
    } finally {
      await app.close();
    }
  });

  it("returns 201 and includes first generated question when starting from link (seed directo)", async () => {
    const container = buildContainer();
    const app = buildServer(container);
  
    try {
      const now = new Date().toISOString();
      const rawToken = "raw-token-start-1";
      const tokenHash = await container.services.tokenService.hash(rawToken);
  
      await container.repositories.templates.save({
        id: "t-start-1",
        ownerUserId: "u1",
        title: "Backend Interview",
        role: "Backend Engineer",
        level: "mid",
        language: "es",
        totalQuestions: 3,
        rubric: {
          dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
          passThreshold: 70,
        },
        llmConfig: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokensPerTurn: 600,
        },
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
  
      await container.repositories.links.save({
        id: "l-start-1",
        templateId: "t-start-1",
        ownerUserId: "u1",
        tokenHash,
        status: "active",
        maxUses: 5,
        usedCount: 0,
        createdAt: now,
      });
  
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/from-link",
        headers: auth("u1"),
        payload: {
          rawToken,
          guestAlias: "Fran",
        },
      });
  
      expect(res.statusCode).toBe(201);
      const body = res.json();
  
      expect(body.code).toBe("OK");
      expect(body.data.status).toBe("ASKING");
      expect(body.data.questions.length).toBe(1);
      expect(body.data.questions[0].index).toBe(1);
      expect(body.data.questions[0].text).toBeTruthy();
      expect(body.data.currentQuestionIndex).toBe(0);
  
      const updatedLink = await container.repositories.links.getById("l-start-1");
      expect(updatedLink?.usedCount).toBe(1);
    } finally {
      await app.close();
    }
  });

  it("returns 502 when generateQuestion fails on start from link", async () => {
    const failingLlm = {
      async generateQuestion() {
        throw new Error("provider down");
      },
      async evaluateAnswer() {
        return {
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["ok"],
          improvements: ["ok"],
          confidence: 0.8,
        };
      },
    };
  
    const container = buildTestContainer({ llmService: failingLlm });
    const app = buildServer(container);
  
    try {
      const now = new Date().toISOString();
      const rawToken = "raw-token-start-fail";
      const tokenHash = await container.services.tokenService.hash(rawToken);
  
      await container.repositories.templates.save({
        id: "t-start-fail",
        ownerUserId: "u1",
        title: "Backend Interview",
        role: "Backend Engineer",
        level: "mid",
        language: "es",
        totalQuestions: 3,
        rubric: {
          dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
          passThreshold: 70,
        },
        llmConfig: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokensPerTurn: 600,
        },
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
  
      await container.repositories.links.save({
        id: "l-start-fail",
        templateId: "t-start-fail",
        ownerUserId: "u1",
        tokenHash,
        status: "active",
        maxUses: 5,
        usedCount: 0,
        createdAt: now,
      });
  
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/from-link",
        headers: auth("u1"),
        payload: {
          rawToken,
          guestAlias: "Fran",
        },
      });
  
      expect(res.statusCode).toBe(502);
      expect(res.json().code).toBe("LLM_QUESTION_GENERATION_FAILED");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and generates next question when complete is called mid-flow", async () => {
    const container = buildContainer();
    const app = buildServer(container);
  
    try {
      await container.repositories.templates.save({
        id: "t-complete-next-1",
        ownerUserId: "u1",
        title: "Backend Interview",
        role: "Backend Engineer",
        level: "mid",
        language: "es",
        totalQuestions: 3,
        rubric: {
          dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
          passThreshold: 70,
        },
        llmConfig: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokensPerTurn: 600,
        },
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      await container.repositories.sessions.save({
        id: "s-complete-next-1",
        templateId: "t-complete-next-1",
        ownerUserId: "u1",
        participant: { type: "guest", guestAlias: "test" },
        entryPoint: { mode: "shared_link", accessLinkId: "l1" },
        status: "FEEDBACKING",
        currentQuestionIndex: 0,
        totalQuestions: 3,
        questions: [
          {
            id: "q1",
            index: 1,
            text: "¿Qué es SOLID?",
            generatedByModel: "manual",
            createdAt: new Date().toISOString(),
          },
        ],
        answers: [
          {
            id: "a1",
            questionId: "q1",
            source: "text",
            text: "Principios de diseño orientado a objetos.",
            receivedAt: new Date().toISOString(),
          },
        ],
        evaluations: [
          {
            id: "e1",
            answerId: "a1",
            score: 80,
            dimensionScores: { architecture: 80 },
            strengths: ["claridad"],
            improvements: ["más profundidad"],
            confidence: 0.9,
            evaluatedAt: new Date().toISOString(),
          },
        ],
        feedbackItems: [],
        startedAt: new Date().toISOString(),
        version: 1,
      });
  
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-complete-next-1/complete",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
  
      expect(body.code).toBe("OK");
      expect(body.data.status).toBe("ASKING");
      expect(body.data.currentQuestionIndex).toBe(1);
      expect(body.data.questions.length).toBe(2);
      expect(body.data.questions[1].index).toBe(2);
      expect(body.data.questions[1].text).toBeTruthy();
    } finally {
      await app.close();
    }
  });

  it("returns 502 when next question generation fails on complete mid-flow", async () => {
    const failingLlm = {
      async generateQuestion() {
        throw new Error("provider down");
      },
      async evaluateAnswer() {
        return {
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["ok"],
          improvements: ["ok"],
          confidence: 0.8,
        };
      },
    };
  
    const container = buildTestContainer({ llmService: failingLlm });
    const app = buildServer(container);
  
    try {
      await container.repositories.templates.save({
        id: "t-complete-next-fail-1",
        ownerUserId: "u1",
        title: "Backend Interview",
        role: "Backend Engineer",
        level: "mid",
        language: "es",
        totalQuestions: 3,
        rubric: {
          dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
          passThreshold: 70,
        },
        llmConfig: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokensPerTurn: 600,
        },
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      await container.repositories.sessions.save({
        id: "s-complete-next-fail-1",
        templateId: "t-complete-next-fail-1",
        ownerUserId: "u1",
        participant: { type: "guest", guestAlias: "test" },
        entryPoint: { mode: "shared_link", accessLinkId: "l1" },
        status: "FEEDBACKING",
        currentQuestionIndex: 0,
        totalQuestions: 3,
        questions: [
          {
            id: "q1",
            index: 1,
            text: "¿Qué es SOLID?",
            generatedByModel: "manual",
            createdAt: new Date().toISOString(),
          },
        ],
        answers: [
          {
            id: "a1",
            questionId: "q1",
            source: "text",
            text: "Principios de diseño orientado a objetos.",
            receivedAt: new Date().toISOString(),
          },
        ],
        evaluations: [
          {
            id: "e1",
            answerId: "a1",
            score: 80,
            dimensionScores: { architecture: 80 },
            strengths: ["claridad"],
            improvements: ["más profundidad"],
            confidence: 0.9,
            evaluatedAt: new Date().toISOString(),
          },
        ],
        feedbackItems: [],
        startedAt: new Date().toISOString(),
        version: 1,
      });
  
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-complete-next-fail-1/complete",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(502);
      expect(res.json().code).toBe("LLM_QUESTION_GENERATION_FAILED");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and advances turn with next question when session is mid-flow", async () => {
    const container = buildContainer();
    const app = buildServer(container);
  
    try {
      await container.repositories.templates.save({
        id: "t-turn-1",
        ownerUserId: "u1",
        title: "Turn Interview",
        role: "Backend Engineer",
        level: "mid",
        language: "es",
        totalQuestions: 2,
        rubric: {
          dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
          passThreshold: 70,
        },
        llmConfig: {
          provider: "openai",
          model: "gpt-4o-mini",
          temperature: 0.2,
          maxTokensPerTurn: 600,
        },
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      await container.repositories.sessions.save({
        id: "s-turn-1",
        templateId: "t-turn-1",
        ownerUserId: "u1",
        participant: { type: "guest", guestAlias: "Fran" },
        entryPoint: { mode: "shared_link", accessLinkId: "l1" },
        status: "ASKING",
        currentQuestionIndex: 0,
        totalQuestions: 2,
        questions: [
          {
            id: "q1",
            index: 1,
            text: "Explain CAP theorem",
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
  
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-turn-1/turn",
        headers: auth("u1"),
        payload: {
          questionId: "q1",
          source: "text",
          text: "Consistency, availability and partition tolerance tradeoffs.",
          rubricDimensions: [{ key: "architecture", weight: 1 }],
        },
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(body.data.session.status).toBe("ASKING");
      expect(body.data.latestEvaluation).toBeTruthy();
      expect(body.data.latestFeedback).toBeTruthy();
      expect(body.data.nextQuestion).toBeTruthy();
      expect(body.data.isCompleted).toBe(false);
    } finally {
      await app.close();
    }
  });
  
  it("returns 200 and marks turn as completed on last question", async () => {
    const container = buildContainer();
    const app = buildServer(container);
  
    try {
      await container.repositories.templates.save({
        id: "t1",
        ownerUserId: "u1",
        title: "Template test",
        role: "Backend Engineer",
        level: "mid",
        language: "es",
        totalQuestions: 1,
        rubric: {
          dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
          passThreshold: 70,
        },
        llmConfig: {
          provider: "mock",
          model: "mock-model-v1",
          temperature: 0.2,
          maxTokensPerTurn: 700,
        },
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      await container.repositories.sessions.save({
        id: "s-turn-last-1",
        templateId: "t1",
        ownerUserId: "u1",
        participant: { type: "guest", guestAlias: "Fran" },
        entryPoint: { mode: "shared_link", accessLinkId: "l1" },
        status: "ASKING",
        currentQuestionIndex: 0,
        totalQuestions: 1,
        questions: [
          {
            id: "q1",
            index: 1,
            text: "Explain dependency inversion",
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
  
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s-turn-last-1/turn",
        headers: auth("u1"),
        payload: {
          questionId: "q1",
          source: "text",
          text: "High-level modules depend on abstractions.",
          rubricDimensions: [{ key: "architecture", weight: 1 }],
        },
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.code).toBe("OK");
      expect(body.data.session.status).toBe("COMPLETED");
      expect(body.data.nextQuestion).toBeNull();
      expect(body.data.isCompleted).toBe(true);
      expect(body.data.latestEvaluation).toBeTruthy();
      expect(body.data.latestFeedback).toBeTruthy();
    } finally {
      await app.close();
    }
  });
  
  it("returns 400 when turn body is invalid", async () => {
    const app = buildServer(buildContainer());
  
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/interview-sessions/s1/turn",
        headers: auth("u1"),
        payload: {
          questionId: "q1",
          source: "text",
          text: "respuesta",
          rubricDimensions: [],
        },
      });
  
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when GET session belongs to another owner", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-owner-403-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "ASKING",
      currentQuestionIndex: 1,
      totalQuestions: 2,
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
        method: "GET",
        url: "/v1/interview-sessions/s-owner-403-1",
        headers: auth("u2"),
      });
  
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when GET session report belongs to another owner", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-report-owner-403-1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "test" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e1",
          answerId: "a1",
          score: 80,
          dimensionScores: { architecture: 80 },
          strengths: ["claridad"],
          improvements: ["más profundidad"],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    const app = buildServer(container);
  
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/s-report-owner-403-1/report",
        headers: auth("u2"),
      });
  
      expect(res.statusCode).toBe(404);
      expect(res.json().code).toBe("SESSION_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns 200 and lists session reports only for authenticated owner", async () => {
    const container = buildContainer();
  
    await container.repositories.sessions.save({
      id: "s-reports-owner-u1",
      templateId: "t1",
      ownerUserId: "u1",
      participant: { type: "guest", guestAlias: "u1" },
      entryPoint: { mode: "shared_link", accessLinkId: "l1" },
      status: "COMPLETED",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e-u1",
          answerId: "a-u1",
          score: 85,
          dimensionScores: { architecture: 85 },
          strengths: [],
          improvements: [],
          confidence: 0.9,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    await container.repositories.sessions.save({
      id: "s-reports-owner-u2",
      templateId: "t2",
      ownerUserId: "u2",
      participant: { type: "guest", guestAlias: "u2" },
      entryPoint: { mode: "shared_link", accessLinkId: "l2" },
      status: "COMPLETED",
      currentQuestionIndex: 1,
      totalQuestions: 1,
      questions: [],
      answers: [],
      evaluations: [
        {
          id: "e-u2",
          answerId: "a-u2",
          score: 70,
          dimensionScores: { architecture: 70 },
          strengths: [],
          improvements: [],
          confidence: 0.7,
          evaluatedAt: new Date().toISOString(),
        },
      ],
      feedbackItems: [],
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      version: 1,
    });
  
    const app = buildServer(container);
  
    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/interview-sessions/reports",
        headers: auth("u1"),
      });
  
      expect(res.statusCode).toBe(200);
      const body = res.json<{ code: string; data: Array<{ sessionId: string }> }>();
  
      expect(body.code).toBe("OK");
      expect(Array.isArray(body.data)).toBe(true);
  
      const ids = body.data.map((x) => x.sessionId);
      expect(ids).toContain("s-reports-owner-u1");
      expect(ids).not.toContain("s-reports-owner-u2");
    } finally {
      await app.close();
    }
  });

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

  it("returns 400 when creating template with invalid llm provider", async () => {
      const app = buildServer(buildContainer());
    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/templates",
        headers: auth("u1"),
        payload: {
          title: "Template invalid provider",
          role: "Backend Engineer",
          level: "mid",
          language: "es",
          totalQuestions: 3,
          rubric: {
            dimensions: [{ key: "architecture", weight: 1, description: "Depth" }],
            passThreshold: 70,
          },
          llmConfig: {
            provider: "foo-provider",
            model: "gpt-4o-mini",
            temperature: 0.2,
            maxTokensPerTurn: 700,
          },
        },
      });
  
      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });
});