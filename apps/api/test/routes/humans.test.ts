/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildEmail } from "@humans/test-utils";

describe("GET /api/humans", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/humans");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no humans exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/humans", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of humans", async () => {
    const db = getDb();
    const h1 = buildHuman({ firstName: "Alice" });
    const h2 = buildHuman({ firstName: "Bob" });
    await db.insert(schema.humans).values([h1, h2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/humans/:id", () => {
  it("returns 404 for non-existent human", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/humans/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns human by id with emails", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "FindMe" });
    await db.insert(schema.humans).values(human);
    const email = buildEmail({ humanId: human.id, email: "findme@test.com" });
    await db.insert(schema.humanEmails).values(email);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/humans/${human.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; emails: { email: string }[] } };
    expect(body.data.id).toBe(human.id);
    expect(body.data.emails).toHaveLength(1);
    expect(body.data.emails[0].email).toBe("findme@test.com");
  });
});

describe("POST /api/humans", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/humans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        firstName: "Jane",
        lastName: "Doe",
        emails: [{ email: "jane@test.com" }],
        types: ["client"],
      }),
    });
    expect(res.status).toBe(403);
  });

  it("creates human and returns 201", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        firstName: "Jane",
        lastName: "Doe",
        emails: [{ email: "jane-new@test.com" }],
        types: ["client"],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBeDefined();
  });

  it("returns 400 for invalid data", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        firstName: "",
        lastName: "",
        emails: [],
        types: [],
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/humans/:id", () => {
  it("returns 404 for non-existent human", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "New" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates human successfully", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Old" });
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/humans/${human.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "New" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { firstName: string } };
    expect(body.data.firstName).toBe("New");
  });
});

describe("PATCH /api/humans/:id/status", () => {
  it("returns 404 for non-existent human", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans/nonexistent/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "active" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates human status successfully", async () => {
    const db = getDb();
    const human = buildHuman({ status: "open" });
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/humans/${human.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "active" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; status: string } };
    expect(body.data.status).toBe("active");
  });
});
