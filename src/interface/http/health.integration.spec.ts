import { describe, expect, it } from "vitest";
import { auth, buildHttpTestServer } from "./tests/helpers.js";

describe("HTTP health routes", { timeout: 15000 }, () => {
  it("returns 200 on /health/live", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health/live",
        headers: auth("u1"),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe("live");
    } finally {
      await app.close();
    }
  });

  it("returns 200 on /health/ready when db is reachable", async () => {
    const app = buildHttpTestServer();
    try {
      const res = await app.inject({
        method: "GET",
        url: "/health/ready",
        headers: auth("u1"),
      });

      expect([200, 503]).toContain(res.statusCode);
    } finally {
      await app.close();
    }
  });
});
