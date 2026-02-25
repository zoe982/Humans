import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { dbMiddleware } from "../../../src/middleware/db";

// Mock drizzle to avoid needing a real D1 binding
vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn((_binding: unknown, _opts: unknown) => ({ mockDb: true })),
}));

type TestContext = {
  Bindings: { DB: unknown };
  Variables: { db: unknown };
};

function createTestApp() {
  const app = new Hono<TestContext>();

  app.use("/*", async (c, next) => {
    c.env = { DB: { mockD1: true } } as unknown as typeof c.env;
    await next();
  });

  app.use("/*", dbMiddleware);

  app.get("/test", (c) => {
    const db = c.get("db");
    return c.json({ hasDb: db != null });
  });

  return app;
}

describe("db middleware", () => {
  it("creates a Drizzle instance and sets it on context", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json() as { hasDb: boolean };
    expect(body.hasDb).toBe(true);
  });

  it("calls drizzle with the D1 binding", async () => {
    const { drizzle } = await import("drizzle-orm/d1");
    const app = createTestApp();
    await app.request("/test");
    expect(drizzle).toHaveBeenCalledWith(
      { mockD1: true },
      expect.objectContaining({ schema: expect.any(Object) }),
    );
  });
});
