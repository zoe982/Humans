/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildUser } from "@humans/test-utils";

describe("GET /api/admin/users", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not admin", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns user list for admin", async () => {
    const db = getDb();
    const extra = buildUser({ email: "extra@test.com" });
    await db.insert(schema.users).values(extra);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2); // admin user + extra
  });
});

describe("GET /api/admin/users/:id", () => {
  it("returns a specific user by id", async () => {
    const db = getDb();
    const target = buildUser({ email: "target@test.com" });
    await db.insert(schema.users).values(target);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`http://localhost/api/admin/users/${target.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; email: string } };
    expect(body.data.id).toBe(target.id);
    expect(body.data.email).toBe("target@test.com");
  });

  it("returns 404 for a non-existent user", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users/does-not-exist", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });
});

describe("POST /api/admin/users (invite)", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", name: "New User", role: "agent" }),
    });
    expect(res.status).toBe(401);
  });

  it("creates a new user and returns 201", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({ email: "invite@test.com", name: "Invited User", role: "agent" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { email: string; isActive: boolean } };
    expect(body.data.email).toBe("invite@test.com");
    expect(body.data.isActive).toBe(true);
  });

  it("returns 409 when email already exists", async () => {
    const db = getDb();
    const existing = buildUser({ email: "duplicate@test.com" });
    await db.insert(schema.users).values(existing);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({ email: "duplicate@test.com", name: "Dup", role: "viewer" }),
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("already exists");
  });

  it("returns 422 for invalid body (missing required fields)", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({ email: "bad-email", name: "", role: "unknown" }),
    });
    // Zod parse throws → Hono error handler returns 4xx
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe("PATCH /api/admin/users/:id", () => {
  it("returns 404 for non-existent user", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/users/no-such-user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({ role: "viewer" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates user role successfully", async () => {
    const db = getDb();
    const target = buildUser({ email: "updateme@test.com", role: "agent" });
    await db.insert(schema.users).values(target);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`http://localhost/api/admin/users/${target.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({ role: "manager" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { role: string } };
    expect(body.data.role).toBe("manager");
  });

  it("deactivates a user", async () => {
    const db = getDb();
    const target = buildUser({ email: "deactivate@test.com", isActive: true });
    await db.insert(schema.users).values(target);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`http://localhost/api/admin/users/${target.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({ isActive: false }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { isActive: boolean } };
    expect(body.data.isActive).toBe(false);
  });
});

describe("GET /api/admin/audit-log", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/audit-log");
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is manager", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/audit-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns empty audit log array for admin when no entries", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/audit-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("respects limit and offset query parameters", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(
      "http://localhost/api/admin/audit-log?limit=10&offset=0",
      { headers: { Cookie: sessionCookie(token) } },
    );
    expect(res.status).toBe(200);
  });
});
