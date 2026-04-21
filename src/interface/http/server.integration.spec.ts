import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

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
});