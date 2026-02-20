/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildEmail } from "@humans/test-utils";

describe("GET /api/emails", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/emails");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no emails exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/emails", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of emails with human names", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Alice", lastName: "Smith" });
    await db.insert(schema.humans).values(human);
    const email = buildEmail({ ownerType: "human", ownerId: human.id, email: "alice@test.com" });
    await db.insert(schema.emails).values(email);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/emails", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { email: string; ownerName: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ownerName).toBe("Alice Smith");
  });
});

describe("POST /api/emails", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: "some-id", email: "test@test.com" }),
    });
    expect(res.status).toBe(403);
  });

  it("adds email to human and returns 201", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id, email: "new-email@test.com" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { email: string; ownerId: string; ownerType: string } };
    expect(body.data.email).toBe("new-email@test.com");
    expect(body.data.ownerId).toBe(human.id);
    expect(body.data.ownerType).toBe("human");
  });

  it("returns 400 for invalid email format", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id, email: "not-an-email" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/emails/:id", () => {
  it("returns 404 for non-existent email", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/emails/nonexistent", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes email successfully", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const email = buildEmail({ ownerType: "human", ownerId: human.id, email: "delete-me@test.com" });
    await db.insert(schema.emails).values(email);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/emails/${email.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
