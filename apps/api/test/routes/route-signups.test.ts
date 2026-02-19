/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

/**
 * Route signups are stored in Supabase, which is not available in the test
 * environment. These tests verify the auth/RBAC layer (401/403) and that
 * the routes are correctly wired. Any calls that pass RBAC will hit the
 * supabase middleware and likely error (500) because SUPABASE_URL is not
 * configured — that is expected and acceptable.
 */

describe("GET /api/route-signups", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/route-signups");
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role (requires viewRouteSignups)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/route-signups", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for agent role (may 500 due to missing Supabase)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/route-signups", {
      headers: { Cookie: sessionCookie(token) },
    });
    // Agent has viewRouteSignups permission, so we should NOT get 401 or 403.
    // We may get 500 because Supabase is not configured in tests.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("passes RBAC for admin role", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/route-signups", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("GET /api/route-signups/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id");
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for agent role", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("PATCH /api/route-signups/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "qualified" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role (requires manageRouteSignups)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "qualified" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for agent role (requires manageRouteSignups: manager+)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "qualified" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status value when authorized", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "invalid_status" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("passes RBAC for manager role with valid body (may 500 due to Supabase)", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "qualified", note: "Looks good" }),
    });
    // Should not be 401 or 403; may be 500 without Supabase
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("DELETE /api/route-signups/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for agent role (requires deleteRouteSignups: admin only)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for manager role (requires deleteRouteSignups: admin only)", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for admin role (may 500 due to Supabase)", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/route-signups/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
