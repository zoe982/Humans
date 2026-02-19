/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildClient } from "@humans/test-utils";

describe("GET /api/clients", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/clients");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no clients exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/clients", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of clients", async () => {
    const db = getDb();
    const c1 = buildClient({ email: "c1@test.com" });
    const c2 = buildClient({ email: "c2@test.com" });
    await db.insert(schema.clients).values([c1, c2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/clients", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/clients/:id", () => {
  it("returns 404 for non-existent client", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/clients/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns client by id", async () => {
    const db = getDb();
    const client = buildClient({ email: "find-me@test.com" });
    await db.insert(schema.clients).values(client);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/clients/${client.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe(client.id);
  });
});

describe("POST /api/clients", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe", email: "j@test.com" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates client and returns 201", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "Jane", lastName: "Doe", email: "new-client@test.com" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { email: string } };
    expect(body.data.email).toBe("new-client@test.com");
  });

  it("returns 400 for invalid data", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "", lastName: "", email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/clients/:id", () => {
  it("returns 404 for non-existent client", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/clients/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "New" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates client successfully", async () => {
    const db = getDb();
    const client = buildClient({ email: "patch-me@test.com", firstName: "Old" });
    await db.insert(schema.clients).values(client);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "New" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { firstName: string } };
    expect(body.data.firstName).toBe("New");
  });
});

describe("DELETE /api/clients/:id", () => {
  it("returns 404 for non-existent client", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/clients/nonexistent", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes client successfully", async () => {
    const db = getDb();
    const client = buildClient({ email: "delete-me@test.com" });
    await db.insert(schema.clients).values(client);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/clients/${client.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
