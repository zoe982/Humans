import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock logger and error-logger before importing middleware
vi.mock("../../../src/lib/logger", () => ({
  logWarn: vi.fn(),
}));
vi.mock("../../../src/lib/error-logger", () => ({
  persistError: vi.fn(),
}));

import { timingMiddleware } from "../../../src/middleware/timing";
import { logWarn } from "../../../src/lib/logger";
import { persistError } from "../../../src/lib/error-logger";

function buildApp(delayMs: number) {
  const app = new Hono<{
    Variables: { requestId: string; db: unknown; session: null; supabase: unknown };
  }>();

  // Simulate requestIdMiddleware
  app.use("/*", async (c, next) => {
    c.set("requestId", "req-123");
    await next();
  });

  app.use("/*", timingMiddleware);

  app.get("/test", async (c) => {
    // Simulate delay via a mock (we'll override performance.now)
    return c.json({ ok: true });
  });

  return { app, delayMs };
}

describe("timingMiddleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds X-Response-Time header on fast requests without logging", async () => {
    // Fast request: no warn, no persist
    let callCount = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      callCount++;
      // First call = start, second call = end → 100ms elapsed
      return callCount === 1 ? 0 : 100;
    });

    const { app } = buildApp(0);
    const res = await app.request("/test");

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Response-Time")).toBe("100ms");
    expect(logWarn).not.toHaveBeenCalled();
    expect(persistError).not.toHaveBeenCalled();
  });

  it("logs a warning for requests between 2s and 5s", async () => {
    let callCount = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 3000; // 3s
    });

    const { app } = buildApp(0);
    const res = await app.request("/test");

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Response-Time")).toBe("3000ms");
    expect(logWarn).toHaveBeenCalledWith(
      "Slow request",
      expect.objectContaining({
        requestId: "req-123",
        method: "GET",
        path: "/test",
        durationMs: 3000,
      }),
    );
    expect(persistError).not.toHaveBeenCalled();
  });

  it("logs warning and persists error for requests >= 5s", async () => {
    let callCount = 0;
    vi.spyOn(performance, "now").mockImplementation(() => {
      callCount++;
      return callCount === 1 ? 0 : 6000; // 6s
    });

    const { app } = buildApp(0);
    const res = await app.request("/test");

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Response-Time")).toBe("6000ms");
    expect(logWarn).toHaveBeenCalledWith(
      "Slow request",
      expect.objectContaining({
        durationMs: 6000,
      }),
    );
    expect(persistError).toHaveBeenCalledWith(
      expect.anything(), // Hono context
      expect.objectContaining({
        requestId: "req-123",
        code: "SLOW_REQUEST",
        message: "Request took 6000ms",
        status: 200,
        method: "GET",
        path: "/test",
        details: expect.objectContaining({ durationMs: 6000 }),
      }),
    );
  });
});
