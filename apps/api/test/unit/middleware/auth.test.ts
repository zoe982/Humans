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

describe("auth middleware — basic authentication", () => {
  let kv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    kv = createMockKV();
  });

  it("returns 401 when no session cookie is present", async () => {
    const app = createTestApp(kv);
    const res = await app.request("/api/test");
    expect(res.status).toBe(401);
  });

  it("returns 401 when session cookie is empty string", async () => {
    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when session token does not exist in KV", async () => {
    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=nonexistent-token" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 200 and sets session on context for valid session", async () => {
    const store = new Map<string, string>();
    const session = { colleagueId: "c1", email: "a@b.com", role: "agent", refreshedAt: Date.now() };
    store.set("session:valid-tok", JSON.stringify(session));
    kv = createMockKV(store);

    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=valid-tok" },
    });
    expect(res.status).toBe(200);
  });
});

describe("auth middleware — KV failure modes", () => {
  let kv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    kv = createMockKV();
  });

  it("returns 401 when KV.get throws", async () => {
    kv.get.mockRejectedValueOnce(new Error("KV unavailable"));
    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-fail" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when KV returns malformed JSON", async () => {
    kv.get.mockResolvedValueOnce("not-valid-json{{{");
    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-bad" },
    });
    expect(res.status).toBe(401);
  });

  it("proceeds normally when session refresh KV.put throws", async () => {
    // Session is old enough to trigger a refresh
    const staleSession = {
      colleagueId: "c1",
      email: "a@b.com",
      role: "agent",
      refreshedAt: Date.now() - (SESSION_REFRESH_THRESHOLD_SECONDS * 1000 + 60_000),
    };
    kv.get.mockResolvedValueOnce(JSON.stringify(staleSession));
    kv.put.mockRejectedValueOnce(new Error("KV write limit exceeded"));

    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-stale" },
    });
    // Request should succeed despite KV.put failure (fire-and-forget)
    expect(res.status).toBe(200);
  });
});

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse returns any
    const storedPayload: unknown = JSON.parse(String(kv.put.mock.calls[0]?.[1]));
    expect(storedPayload).toStrictEqual(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any returns any
      expect.objectContaining({ refreshedAt: expect.any(Number) }),
    );
  });

  it("does NOT refresh session when refreshedAt is recent (< 6 hours)", async () => {
    const recentTimestamp = Date.now() - (SESSION_REFRESH_THRESHOLD_SECONDS * 1000 - 60_000); // just under threshold
    const session = { colleagueId: "c1", email: "a@b.com", role: "agent", refreshedAt: recentTimestamp };
    store.set("session:tok-2", JSON.stringify(session));

    const app = createTestApp(kv);
    const res = await app.request("/api/test", {
      headers: { Cookie: "humans_session=tok-2" },
    });

    expect(res.status).toBe(200);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("refreshes session when refreshedAt is older than 6 hours", async () => {
    const staleTimestamp = Date.now() - (SESSION_REFRESH_THRESHOLD_SECONDS * 1000 + 60_000); // just over threshold
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse returns any
    const storedPayload: unknown = JSON.parse(String(kv.put.mock.calls[0]?.[1]));
    expect(storedPayload).toStrictEqual(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any returns any
      expect.objectContaining({ refreshedAt: expect.any(Number) }),
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- shape validated by objectContaining above
    expect((storedPayload as { refreshedAt: number }).refreshedAt).toBeGreaterThan(staleTimestamp);
  });
});
