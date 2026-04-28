import { buildTestContainer } from "../../infrastructure/test-container.js";
import { buildServer } from "./server.js";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { authApi } from "../../modules/auth/auth.api.js";

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

describe("authApi", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POST /v1/auth/login devuelve token y usuario", async () => {
    const fakeResponse = {
      accessToken: "test-user:u1",
      user: { id: "u1", email: "owner@mentorix.dev", role: "owner" },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    } as Response);

    const result = await authApi.login({
      email: "owner@mentorix.dev",
      password: "123456",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];

    expect(String(url)).toContain("/v1/auth/login");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({ email: "owner@mentorix.dev", password: "123456" })
    );
    expect(result).toEqual(fakeResponse);
  });

  it("GET /v1/auth/me envía Authorization Bearer", async () => {
    const fakeResponse = {
      user: { id: "u1", email: "owner@mentorix.dev", role: "owner" },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeResponse,
    } as Response);

    const result = await authApi.me("test-user:u1");

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];

    expect(String(url)).toContain("/v1/auth/me");
    expect(init?.method).toBe("GET");
    expect((init?.headers as Record<string, string>)?.Authorization).toBe(
      "Bearer test-user:u1"
    );
    expect(result).toEqual(fakeResponse);
  });

  it("propaga error HTTP en login inválido", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      }),
    } as Response);

    await expect(
      authApi.login({ email: "owner@mentorix.dev", password: "wrong" })
    ).rejects.toThrow("Invalid email or password");
  });
});
});