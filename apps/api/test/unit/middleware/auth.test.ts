import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { SESSION_TTL_SECONDS, SESSION_REFRESH_THRESHOLD_SECONDS } from "@humans/shared";
import { authMiddleware } from "../../../src/middleware/auth";

function createMockKV(store = new Map<string, string>()) {
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

type TestContext = {
  Bindings: { SESSIONS: ReturnType<typeof createMockKV> };
  Variables: { session: unknown };
};

function createTestApp(kv: ReturnType<typeof createMockKV>) {
  const app = new Hono<TestContext>();

  app.use("/*", async (c, next) => {
    c.env = { SESSIONS: kv } as unknown as typeof c.env;
    await next();
  });

  app.use("/*", authMiddleware);

  app.get("/api/test", (c) => c.json({ ok: true }));

  return app;
}

describe("auth middleware — sliding session refresh", () => {
  let kv: ReturnType<typeof createMockKV>;
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    kv = createMockKV(store);
  });

  it("refreshes session TTL when refreshedAt is absent (legacy session)", async () => {
    const session = { colleagueId: "c1", email: "a@b.com", role: "agent" };
    store.set("session:tok-1", JSON.stringify(session));

    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-1" },
    });

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith(
      "session:tok-1",
      expect.any(String),
      { expirationTtl: SESSION_TTL_SECONDS },
    );

    // Verify refreshedAt was added to the session payload
    const putCall = kv.put.mock.calls[0] as [string, string, { expirationTtl: number }];
    const updated = JSON.parse(putCall[1]) as Record<string, unknown>;
    expect(updated.refreshedAt).toEqual(expect.any(Number));
  });

  it("does NOT refresh session when refreshedAt is recent (< 1 hour)", async () => {
    const recentTimestamp = Date.now() - (SESSION_REFRESH_THRESHOLD_SECONDS * 1000 - 60_000); // 59 min ago
    const session = { colleagueId: "c1", email: "a@b.com", role: "agent", refreshedAt: recentTimestamp };
    store.set("session:tok-2", JSON.stringify(session));

    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-2" },
    });

    expect(res.status).toBe(200);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("refreshes session when refreshedAt is older than 1 hour", async () => {
    const staleTimestamp = Date.now() - (SESSION_REFRESH_THRESHOLD_SECONDS * 1000 + 60_000); // 61 min ago
    const session = { colleagueId: "c1", email: "a@b.com", role: "agent", refreshedAt: staleTimestamp };
    store.set("session:tok-3", JSON.stringify(session));

    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-3" },
    });

    expect(res.status).toBe(200);
    expect(kv.put).toHaveBeenCalledWith(
      "session:tok-3",
      expect.any(String),
      { expirationTtl: SESSION_TTL_SECONDS },
    );

    const putCall = kv.put.mock.calls[0] as [string, string, { expirationTtl: number }];
    const updated = JSON.parse(putCall[1]) as Record<string, unknown>;
    expect(updated.refreshedAt).toEqual(expect.any(Number));
    expect(updated.refreshedAt as number).toBeGreaterThan(staleTimestamp);
  });
});
