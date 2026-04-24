import { describe, expect, it } from "vitest";
import { buildTestContainer } from "../../infrastructure/test-container.js";
import { buildServer } from "./server.js";
import { auth } from "./tests/helpers.js";

const buildContainer = buildTestContainer;

describe("HTTP report routes", { timeout: 15000 }, () => {
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
});
