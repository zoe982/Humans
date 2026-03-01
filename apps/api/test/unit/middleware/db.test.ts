import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { dbMiddleware } from "../../../src/middleware/db";

// Mock postgres and drizzle to avoid needing a real Hyperdrive binding
vi.mock("postgres", () => ({
  default: vi.fn((_connStr: unknown, _opts: unknown) => ({ mockSql: true })),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: vi.fn((_sql: unknown, _opts: unknown) => ({ mockDb: true })),
}));

type TestContext = {
  Bindings: { HYPERDRIVE: { connectionString: string } };
  Variables: { db: unknown };
};

function createTestApp() {
  const app = new Hono<TestContext>();

  app.use("/*", async (c, next) => {
    c.env = { HYPERDRIVE: { connectionString: "postgresql://test:test@localhost:5432/test" } } as unknown as typeof c.env;
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

  it("calls postgres with the Hyperdrive connection string", async () => {
    const postgres = (await import("postgres")).default;
    const app = createTestApp();
    await app.request("/test");
    expect(postgres).toHaveBeenCalledWith(
      "postgresql://test:test@localhost:5432/test",
      expect.objectContaining({ max: 5 }),
    );
  });
});
