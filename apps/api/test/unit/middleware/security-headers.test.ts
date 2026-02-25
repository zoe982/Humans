import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { securityHeaders } from "../../../src/middleware/security-headers";

function createTestApp() {
  const app = new Hono();
  app.use("/*", securityHeaders);
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

describe("security-headers middleware", () => {
  it("sets X-Content-Type-Options to nosniff", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets X-Frame-Options to DENY", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets Strict-Transport-Security with includeSubDomains", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
  });

  it("sets Permissions-Policy to deny camera, microphone, geolocation", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });

  it("sets Referrer-Policy to strict-origin-when-cross-origin", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("sets X-Permitted-Cross-Domain-Policies to none", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.headers.get("X-Permitted-Cross-Domain-Policies")).toBe("none");
  });

  it("applies headers after next() (response has them on successful routes)", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    expect(res.status).toBe(200);
    // All 6 headers present
    const headerNames = [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Strict-Transport-Security",
      "Permissions-Policy",
      "Referrer-Policy",
      "X-Permitted-Cross-Domain-Policies",
    ];
    for (const name of headerNames) {
      expect(res.headers.has(name)).toBe(true);
    }
  });
});
