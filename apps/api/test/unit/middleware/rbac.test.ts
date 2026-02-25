import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requirePermission } from "../../../src/middleware/rbac";

type TestContext = {
  Variables: { session: { colleagueId: string; email: string; role: string } | null };
};

function createTestApp(permission: Parameters<typeof requirePermission>[0]) {
  const app = new Hono<TestContext>();

  // Inject session middleware stub
  app.use("/*", async (c, next) => {
    const role = c.req.header("X-Test-Role");
    if (role != null) {
      c.set("session", { colleagueId: "c1", email: "a@b.com", role });
    } else {
      c.set("session", null);
    }
    await next();
  });

  app.use("/*", requirePermission(permission));
  app.get("/test", (c) => c.json({ ok: true }));
  return app;
}

describe("rbac middleware — requirePermission", () => {
  it("returns 401 when session is null", async () => {
    const app = createTestApp("manageHumans");
    const res = await app.request("/test");
    expect(res.status).toBe(401);
  });

  it("returns 403 when role lacks the required permission", async () => {
    const app = createTestApp("manageHumans");
    const res = await app.request("/test", {
      headers: { "X-Test-Role": "viewer" },
    });
    expect(res.status).toBe(403);
  });

  it("allows request when role has the required permission", async () => {
    const app = createTestApp("manageHumans");
    const res = await app.request("/test", {
      headers: { "X-Test-Role": "agent" },
    });
    expect(res.status).toBe(200);
  });

  it("allows admin for any permission", async () => {
    const app = createTestApp("manageColleagues");
    const res = await app.request("/test", {
      headers: { "X-Test-Role": "admin" },
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 for manager on admin-only permission", async () => {
    const app = createTestApp("manageColleagues");
    const res = await app.request("/test", {
      headers: { "X-Test-Role": "manager" },
    });
    expect(res.status).toBe(403);
  });
});
