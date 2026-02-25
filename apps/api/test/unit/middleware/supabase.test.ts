import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { supabaseMiddleware } from "../../../src/middleware/supabase";

// Mock createClient to avoid needing real Supabase credentials
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((_url: string, _key: string) => ({ mockSupabase: true })),
}));

type TestContext = {
  Bindings: { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string };
  Variables: { supabase: unknown };
};

function createTestApp() {
  const app = new Hono<TestContext>();

  app.use("/*", async (c, next) => {
    c.env = {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-key",
    } as unknown as typeof c.env;
    await next();
  });

  app.use("/*", supabaseMiddleware);

  app.get("/test", (c) => {
    const supabase = c.get("supabase");
    return c.json({ hasSupabase: supabase != null });
  });

  return app;
}

describe("supabase middleware", () => {
  it("creates a Supabase client and sets it on context", async () => {
    const app = createTestApp();
    const res = await app.request("/test");
    const body = await res.json() as { hasSupabase: boolean };
    expect(body.hasSupabase).toBe(true);
  });

  it("calls createClient with env credentials", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const app = createTestApp();
    await app.request("/test");
    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-key",
    );
  });
});
