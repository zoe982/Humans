import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { rateLimitMiddleware } from "../../../src/middleware/rate-limit";

interface MockRateLimiter {
  limit: ReturnType<typeof vi.fn>;
}

function createMockRateLimiter(success = true): MockRateLimiter {
  return {
    limit: vi.fn(async () => ({ success })),
  };
}

interface TestEnv {
  RL_AUTH: MockRateLimiter;
  RL_API: MockRateLimiter;
  RL_SEARCH: MockRateLimiter;
  RL_CLIENT_ERRORS: MockRateLimiter;
  SESSIONS: unknown;
}

type TestContext = {
  Bindings: TestEnv;
};

function createTestApp(env: TestEnv) {
  const app = new Hono<TestContext>();

  // Inject mock env bindings
  app.use("/*", async (c, next) => {
    c.env = env as unknown as typeof c.env;
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
  app.post("/api/client-errors", (c) => c.json({ ok: true }));
  app.get("/api/humans", (c) => c.json({ ok: true }));
  app.get("/health", (c) => c.json({ ok: true }));

  return app;
}

describe("rate-limit middleware", () => {
  let env: TestEnv;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    env = {
      RL_AUTH: createMockRateLimiter(true),
      RL_API: createMockRateLimiter(true),
      RL_SEARCH: createMockRateLimiter(true),
      RL_CLIENT_ERRORS: createMockRateLimiter(true),
      SESSIONS: {},
    };
    app = createTestApp(env);
  });

  describe("/auth/me exemption", () => {
    it("does NOT rate-limit /auth/me requests", async () => {
      const res = await app.request("/auth/me", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(200);
      // No rate limiter should have been called
      expect(env.RL_AUTH.limit).not.toHaveBeenCalled();
      expect(env.RL_API.limit).not.toHaveBeenCalled();
    });
  });

  describe("rate limiter binding selection", () => {
    it("calls RL_AUTH for /auth/* routes", async () => {
      await app.request("/auth/google/login", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(env.RL_AUTH.limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
      expect(env.RL_API.limit).not.toHaveBeenCalled();
    });

    it("calls RL_SEARCH for /api/search", async () => {
      await app.request("/api/search", {
        headers: { "CF-Connecting-IP": "10.0.0.1" },
      });
      expect(env.RL_SEARCH.limit).toHaveBeenCalledWith({ key: "10.0.0.1" });
      expect(env.RL_API.limit).not.toHaveBeenCalled();
    });

    it("calls RL_CLIENT_ERRORS for /api/client-errors", async () => {
      await app.request("/api/client-errors", {
        method: "POST",
        headers: { "CF-Connecting-IP": "10.0.0.2" },
      });
      expect(env.RL_CLIENT_ERRORS.limit).toHaveBeenCalledWith({ key: "10.0.0.2" });
      expect(env.RL_API.limit).not.toHaveBeenCalled();
    });

    it("calls RL_API for general /api/* routes", async () => {
      await app.request("/api/humans", {
        headers: { "CF-Connecting-IP": "192.168.1.1" },
      });
      expect(env.RL_API.limit).toHaveBeenCalledWith({ key: "192.168.1.1" });
      expect(env.RL_AUTH.limit).not.toHaveBeenCalled();
    });

    it("does NOT rate-limit non-API, non-auth routes", async () => {
      await app.request("/health", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(env.RL_AUTH.limit).not.toHaveBeenCalled();
      expect(env.RL_API.limit).not.toHaveBeenCalled();
      expect(env.RL_SEARCH.limit).not.toHaveBeenCalled();
      expect(env.RL_CLIENT_ERRORS.limit).not.toHaveBeenCalled();
    });
  });

  describe("rate limit enforcement", () => {
    it("returns 429 when rate limiter returns success: false", async () => {
      env.RL_API = createMockRateLimiter(false);
      app = createTestApp(env);

      const res = await app.request("/api/humans", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(429);
      const body = await res.json() as { error: string };
      expect(body.error).toBe("Too many requests");
    });

    it("returns 200 when rate limiter returns success: true", async () => {
      const res = await app.request("/api/humans", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(200);
    });

    it("includes Retry-After header on 429", async () => {
      env.RL_AUTH = createMockRateLimiter(false);
      app = createTestApp(env);

      const res = await app.request("/auth/google/login", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBe("60");
    });
  });

  describe("IP key extraction", () => {
    it("uses CF-Connecting-IP as rate limit key", async () => {
      await app.request("/api/humans", {
        headers: { "CF-Connecting-IP": "203.0.113.42" },
      });
      expect(env.RL_API.limit).toHaveBeenCalledWith({ key: "203.0.113.42" });
    });

    it("uses 'unknown' when CF-Connecting-IP header is absent", async () => {
      await app.request("/api/humans");
      expect(env.RL_API.limit).toHaveBeenCalledWith({ key: "unknown" });
    });
  });

  describe("graceful degradation", () => {
    it("passes request through when limiter.limit() throws", async () => {
      env.RL_API.limit.mockRejectedValueOnce(new Error("binding unavailable"));
      app = createTestApp(env);

      const res = await app.request("/api/humans", {
        headers: { "CF-Connecting-IP": "1.2.3.4" },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("KV isolation", () => {
    it("never reads or writes KV (SESSIONS binding untouched)", async () => {
      const sessionsSpy = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };
      env.SESSIONS = sessionsSpy;
      app = createTestApp(env);

      // Fire requests to every rate-limited path
      await app.request("/auth/google/login", { headers: { "CF-Connecting-IP": "1.2.3.4" } });
      await app.request("/api/humans", { headers: { "CF-Connecting-IP": "1.2.3.4" } });
      await app.request("/api/search", { headers: { "CF-Connecting-IP": "1.2.3.4" } });
      await app.request("/api/client-errors", { method: "POST", headers: { "CF-Connecting-IP": "1.2.3.4" } });

      expect(sessionsSpy.get).not.toHaveBeenCalled();
      expect(sessionsSpy.put).not.toHaveBeenCalled();
      expect(sessionsSpy.delete).not.toHaveBeenCalled();
    });
  });
});
