/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

/**
 * Evacuation leads are stored in Supabase (urgent_contact_requests table),
 * which is not available in the test environment. These tests verify the
 * auth/RBAC layer (401/403) and that the routes are correctly wired. Any
 * calls that pass RBAC will hit the supabase middleware and may error (500)
 * because SUPABASE_URL is not configured — that is expected and acceptable.
 */

describe("GET /api/evacuation-leads", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads");
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role (requires viewEvacuationLeads)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for agent role (may 500 due to missing Supabase)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads", {
      headers: { Cookie: sessionCookie(token) },
    });
    // Agent has viewEvacuationLeads permission, so we should NOT get 401 or 403.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("passes RBAC for admin role", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("GET /api/evacuation-leads/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id");
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for agent role", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("PATCH /api/evacuation-leads/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending_response" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role (requires manageEvacuationLeads)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "pending_response" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for agent role (requires manageEvacuationLeads: manager+)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "pending_response" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status value when authorized", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "invalid_status" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no fields to update", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("passes RBAC for manager role with valid body (may 500 due to Supabase)", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "pending_response", note: "Looks good" }),
    });
    // Should not be 401 or 403; may be 500 without Supabase
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("DELETE /api/evacuation-leads/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for agent role (requires deleteEvacuationLeads: admin only)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 for manager role (requires deleteEvacuationLeads: admin only)", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for admin role (may 500 due to Supabase)", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("PATCH /api/evacuation-leads/:id/next-action", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/next-action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "follow_up", description: "Call them" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/next-action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ type: "follow_up", description: "Call them" }),
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for manager role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/next-action", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ type: "follow_up", description: "Call them" }),
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("GET /api/evacuation-leads/:id/linked-human", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/linked-human");
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/linked-human", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for agent role", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/linked-human", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("POST /api/evacuation-leads/:id/link-human", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/link-human", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ humanId: "h1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for agent role (requires manageEvacuationLeads: manager+)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/link-human", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: "h1" }),
    });
    expect(res.status).toBe(403);
  });

  it("passes RBAC for manager role (may 500 without D1 data)", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/evacuation-leads/some-id/link-human", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: "h1" }),
    });
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
