/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

// Use the /api/admin/users route as the RBAC test surface:
// - requires authMiddleware (valid session)
// - requires requirePermission("manageUsers") (admin only)

describe("Auth middleware (via /api/admin/users)", () => {
  it("returns 401 when no session cookie is provided", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/users");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { message?: string; error?: string };
    const msg = body.message ?? body.error ?? "";
    expect(msg).toMatch(/authentication required/i);
  });

  it("returns 401 when session token does not exist in KV", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: "humans_session=bogus-token-that-does-not-exist" },
    });
    expect(res.status).toBe(401);
  });
});

describe("RBAC middleware (manageUsers permission)", () => {
  it("returns 403 for a viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { message?: string; error?: string };
    const msg = body.message ?? body.error ?? "";
    expect(msg).toMatch(/insufficient permissions/i);
  });

  it("returns 403 for an agent role", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for a manager role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin role", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });
});

describe("RBAC middleware (viewRecords permission via /api/clients)", () => {
  it("returns 200 for a viewer accessing clients list", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/clients", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });

  it("returns 401 for unauthenticated access to clients", async () => {
    const res = await SELF.fetch("http://localhost/api/clients");
    expect(res.status).toBe(401);
  });
});
