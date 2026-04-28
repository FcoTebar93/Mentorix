import { describe, expect, it } from "vitest";
import { buildTestContainer } from "../../infrastructure/test-container.js";
import { buildServer } from "./server.js";

describe("HTTP auth routes", { timeout: 15000 }, () => {
  it("POST /v1/auth/login returns 200 with accessToken and user for valid credentials", async () => {
    const app = buildServer(buildTestContainer());

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "owner@mentorix.dev",
          password: "123456",
        },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        accessToken: string;
        user: { id: string; email: string; name?: string; role?: string };
      }>();

      expect(body.accessToken).toBe("test-user:u1");
      expect(body.user.id).toBe("u1");
      expect(body.user.email).toBe("owner@mentorix.dev");
      expect(body.user.role).toBe("owner");
    } finally {
      await app.close();
    }
  });

  it("POST /v1/auth/login returns 401 for invalid credentials", async () => {
    const app = buildServer(buildTestContainer());

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "owner@mentorix.dev",
          password: "bad-password",
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe("UNAUTHORIZED");
    } finally {
      await app.close();
    }
  });

  it("POST /v1/auth/login returns 400 for invalid body", async () => {
    const app = buildServer(buildTestContainer());

    try {
      const res = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "not-an-email",
          password: "",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().code).toBe("INVALID_BODY");
    } finally {
      await app.close();
    }
  });

  it("GET /v1/auth/me returns 200 with user for valid bearer token", async () => {
    const app = buildServer(buildTestContainer());

    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/auth/me",
        headers: {
          authorization: "Bearer test-user:u1",
        },
      });

      expect(res.statusCode).toBe(200);

      const body = res.json<{
        user: { id: string; email: string; name?: string; role?: string };
      }>();

      expect(body.user.id).toBe("u1");
      expect(body.user.email).toBe("owner@mentorix.dev");
      expect(body.user.role).toBe("owner");
    } finally {
      await app.close();
    }
  });

  it("GET /v1/auth/me returns 401 without Authorization header", async () => {
    const app = buildServer(buildTestContainer());

    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/auth/me",
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe("UNAUTHORIZED");
    } finally {
      await app.close();
    }
  });

  it("GET /v1/auth/me returns 401 for unknown token user", async () => {
    const app = buildServer(buildTestContainer());

    try {
      const res = await app.inject({
        method: "GET",
        url: "/v1/auth/me",
        headers: {
          authorization: "Bearer test-user:unknown",
        },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().code).toBe("UNAUTHORIZED");
    } finally {
      await app.close();
    }
  });
});