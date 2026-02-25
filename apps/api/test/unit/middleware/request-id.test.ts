import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requestIdMiddleware } from "../../../src/middleware/request-id";

function createTestApp() {
  const app = new Hono();
  app.use("/*", requestIdMiddleware);
  app.get("/test", (c) => c.json({ requestId: c.get("requestId") }));
  return app;
}

describe("request-id middleware", () => {
  it("generates a UUID and sets it on context", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json() as { requestId: string };
    expect(body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("sets X-Request-Id response header", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const header = res.headers.get("X-Request-Id");
    expect(header).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("context requestId matches response header", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json() as { requestId: string };
    const header = res.headers.get("X-Request-Id");
    expect(body.requestId).toBe(header);
  });
});
