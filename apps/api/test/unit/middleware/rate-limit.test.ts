import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { rateLimitMiddleware } from "../../../src/middleware/rate-limit";

// In-memory KV mock
function createMockKV() {
  const store = new Map<string, { value: string; expiration: number }>();
  return {
    get: vi.fn(async (key: string) => {
      const entry = store.get(key);
      if (entry == null) return null;
      if (Date.now() > entry.expiration) {
        store.delete(key);
        return null;
      }
      return entry.value;
    }),
    put: vi.fn(async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      const ttl = opts?.expirationTtl ?? 120;
      store.set(key, { value, expiration: Date.now() + ttl * 1000 });
    }),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

type TestContext = {
  Bindings: { SESSIONS: ReturnType<typeof createMockKV> };
};

function createTestApp(kv: ReturnType<typeof createMockKV>) {
  const app = new Hono<TestContext>();

  // Inject mock SESSIONS KV
  app.use("/*", async (c, next) => {
    c.env = { SESSIONS: kv } as unknown as typeof c.env;
    await next();
  });

  // Apply rate limiter
  app.use("/*", rateLimitMiddleware);

  // Route stubs
  app.get("/auth/me", (c) => c.json({ ok: true }));
  app.get("/auth/google/login", (c) => c.json({ ok: true }));
  app.get("/auth/google/callback", (c) => c.json({ ok: true }));
  app.post("/auth/logout", (c) => c.json({ ok: true }));
  app.get("/api/search", (c) => c.json({ ok: true }));

  return app;
}

describe("rate-limit middleware", () => {
  let kv: ReturnType<typeof createMockKV>;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    kv = createMockKV();
    app = createTestApp(kv);
  });

  describe("/auth/me exemption", () => {
    it("does NOT rate-limit /auth/me requests", async () => {
      // Fire 15 requests — all should succeed since /auth/me should be exempt
      for (let i = 0; i < 15; i++) {
        const res = await app.request("/auth/me", {
          headers: { "CF-Connecting-IP": "1.2.3.4" },
        });
        expect(res.status).toBe(200);
      }

      // KV should never have been written to for /auth/me
      expect(kv.put).not.toHaveBeenCalled();
    });
  });

  describe("auth mutation routes are still rate-limited", () => {
    it("rate-limits /auth/google/login after 10 requests", async () => {
      for (let i = 0; i < 10; i++) {
        const res = await app.request("/auth/google/login", {
          headers: { "CF-Connecting-IP": "1.2.3.4" },
        });
        expect(res.status).toBe(200);
      }

      const res = await app.request("/auth/google/login", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(429);
    });

    it("rate-limits /auth/google/callback after 10 requests", async () => {
      for (let i = 0; i < 10; i++) {
        const res = await app.request("/auth/google/callback", {
          headers: { "CF-Connecting-IP": "1.2.3.4" },
        });
        expect(res.status).toBe(200);
      }

      const res = await app.request("/auth/google/callback", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(429);
    });

    it("rate-limits /auth/logout after 10 requests", async () => {
      for (let i = 0; i < 10; i++) {
        const res = await app.request("/auth/logout", {
          method: "POST",
          headers: { "CF-Connecting-IP": "1.2.3.4" },
        });
        expect(res.status).toBe(200);
      }

      const res = await app.request("/auth/logout", {
        method: "POST",
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(429);
    });
  });

  describe("auth rate limits share a bucket", () => {
    it("counts /auth/google/login and /auth/logout in the same bucket", async () => {
      // 5 login requests
      for (let i = 0; i < 5; i++) {
        const res = await app.request("/auth/google/login", {
          headers: { "CF-Connecting-IP": "1.2.3.4" },
        });
        expect(res.status).toBe(200);
      }
      // 5 logout requests
      for (let i = 0; i < 5; i++) {
        const res = await app.request("/auth/logout", {
          method: "POST",
          headers: { "CF-Connecting-IP": "1.2.3.4" },
        });
        expect(res.status).toBe(200);
      }
      // 11th request should be blocked
      const res = await app.request("/auth/google/login", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(429);
    });
  });
});
