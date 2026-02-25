import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { realtimeMiddleware } from "../../../src/middleware/realtime";

// Mock notifyRealtime to avoid DO binding dependency
vi.mock("../../../src/realtime/notify", () => ({
  notifyRealtime: vi.fn(),
}));

import { notifyRealtime } from "../../../src/realtime/notify";

const mockNotify = vi.mocked(notifyRealtime);

type TestContext = {
  Variables: { session: { colleagueId: string; email: string; role: string } | null };
};

function createTestApp() {
  const app = new Hono<TestContext>();
  app.use("/*", realtimeMiddleware);
  app.get("/api/humans", (c) => c.json({ ok: true }));
  app.post("/api/humans", (c) => c.json({ ok: true }, 201));
  app.patch("/api/humans/:id", (c) => c.json({ ok: true }));
  app.delete("/api/humans/:id", (c) => c.json({ ok: true }));
  app.get("/health", (c) => c.json({ ok: true }));
  app.post("/auth/logout", (c) => c.json({ ok: true }));
  // Route that returns an error
  app.post("/api/fail", (c) => c.json({ error: "bad" }, 400));
  return app;
}

describe("realtime middleware", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    mockNotify.mockClear();
    app = createTestApp();
  });

  it("notifies on POST to /api/* with 2xx status", async () => {
    await app.request("/api/humans", { method: "POST" });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.anything(),
      { path: "/api/humans", method: "POST" },
    );
  });

  it("notifies on PATCH to /api/* with 2xx status", async () => {
    await app.request("/api/humans/h1", { method: "PATCH" });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.anything(),
      { path: "/api/humans/h1", method: "PATCH" },
    );
  });

  it("notifies on DELETE to /api/* with 2xx status", async () => {
    await app.request("/api/humans/h1", { method: "DELETE" });
    expect(mockNotify).toHaveBeenCalledWith(
      expect.anything(),
      { path: "/api/humans/h1", method: "DELETE" },
    );
  });

  it("does NOT notify on GET requests", async () => {
    await app.request("/api/humans");
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("does NOT notify on non-/api/ paths", async () => {
    await app.request("/auth/logout", { method: "POST" });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("does NOT notify on non-2xx responses", async () => {
    await app.request("/api/fail", { method: "POST" });
    expect(mockNotify).not.toHaveBeenCalled();
  });
});
