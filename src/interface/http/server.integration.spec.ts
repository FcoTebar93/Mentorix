import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";
import type { InterviewSessionProps } from "../../domain/interview/session/types.js";
import { buildContainer } from "../../infrastructure/container.js";

describe("HTTP interview flow", () => {
  it("returns 400 when evaluate body is invalid", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/s1/evaluate",
      payload: { rubricDimensions: [] },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe("INVALID_BODY");

    await app.close();
  });

  it("returns 404 when session does not exist on submit", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/unknown/answers",
      payload: {
        questionId: "q1",
        source: "text",
        text: "respuesta",
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe("SESSION_NOT_FOUND");

    await app.close();
  });

  it("returns 404 when session does not exist on complete", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/unknown/complete",
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe("SESSION_NOT_FOUND");

    await app.close();
  });

  it("returns 404 when GET session does not exist", async () => {
    const app = buildServer();
  
    const res = await app.inject({
      method: "GET",
      url: "/v1/interview-sessions/unknown",
    });
  
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe("SESSION_NOT_FOUND");
  
    await app.close();
  });
  
  it("returns 200 when GET session exists", async () => {
    const app = buildServer();
    
    await app.close();
  });

  it("returns 400 when submit answer body is invalid", async () => {
    const app = buildServer();
  
    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/s1/answers",
      payload: {
        questionId: "",
        source: "text",
        text: "",
      },
    });
  
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_BODY");
  
    await app.close();
  });

  it("returns 200 and transitions session to EVALUATING on valid submit", async () => {
    const container = buildContainer();
  
    const seeded: InterviewSessionProps = {
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
    };
  
    await container.repositories.sessions.save(seeded);
    const app = buildServer(container);
  
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
  
    await app.close();
  });

  it("returns 400 when evaluate body is invalid", async () => {
    const app = buildServer();
  
    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/s1/evaluate",
      payload: { rubricDimensions: [] },
    });
  
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("INVALID_BODY");
  
    await app.close();
  });

  it("returns 404 when evaluate session does not exist", async () => {
    const app = buildServer();
  
    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/unknown/evaluate",
      payload: {
        rubricDimensions: [{ key: "architecture", weight: 1 }],
      },
    });
  
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe("SESSION_NOT_FOUND");
  
    await app.close();
  });

  it("returns 200 and transitions to FEEDBACKING on valid evaluate", async () => {
    const container = buildContainer();
  
    // seed session already in EVALUATING
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
  
    const res = await app.inject({
      method: "POST",
      url: "/v1/interview-sessions/s-eval-1/evaluate",
      payload: {
        rubricDimensions: [{ key: "architecture", weight: 1 }],
      },
    });
  
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe("OK");
    expect(body.data.status).toBe("FEEDBACKING");
    expect(body.data.evaluations.length).toBe(1);
  
    await app.close();
  });
});