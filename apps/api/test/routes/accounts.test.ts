/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildAccount, buildHuman } from "@humans/test-utils";

describe("GET /api/accounts", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/accounts");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no accounts exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/accounts", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of accounts", async () => {
    const db = getDb();
    const a1 = buildAccount({ name: "Acme Corp" });
    const a2 = buildAccount({ name: "Beta Inc" });
    await db.insert(schema.accounts).values([a1, a2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/accounts", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/accounts/:id", () => {
  it("returns 404 for non-existent account", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/accounts/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns account by id", async () => {
    const db = getDb();
    const account = buildAccount({ name: "FindMe Corp" });
    await db.insert(schema.accounts).values(account);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/accounts/${account.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; name: string } };
    expect(body.data.id).toBe(account.id);
    expect(body.data.name).toBe("FindMe Corp");
  });
});

describe("POST /api/accounts", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Acme Corp" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates account and returns 201", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Acme Corp" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBeDefined();
  });

  it("returns 400 for invalid data", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/accounts/:id", () => {
  it("returns 404 for non-existent account", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/accounts/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates account successfully", async () => {
    const db = getDb();
    const account = buildAccount({ name: "Old Name" });
    await db.insert(schema.accounts).values(account);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe("New Name");
  });
});

describe("PATCH /api/accounts/:id/status", () => {
  it("returns 404 for non-existent account", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/accounts/nonexistent/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "active" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates account status successfully", async () => {
    const db = getDb();
    const account = buildAccount({ status: "open" });
    await db.insert(schema.accounts).values(account);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/accounts/${account.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "active" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; status: string } };
    expect(body.data.status).toBe("active");
  });
});

describe("POST /api/accounts/:id/emails", () => {
  it("adds email to account and returns 201", async () => {
    const db = getDb();
    const account = buildAccount();
    await db.insert(schema.accounts).values(account);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/accounts/${account.id}/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ email: "info@acme.com" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { email: string; ownerId: string; ownerType: string } };
    expect(body.data.email).toBe("info@acme.com");
    expect(body.data.ownerId).toBe(account.id);
    expect(body.data.ownerType).toBe("account");
  });
});

describe("POST /api/accounts/:id/phone-numbers", () => {
  it("adds phone number to account and returns 201", async () => {
    const db = getDb();
    const account = buildAccount();
    await db.insert(schema.accounts).values(account);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/accounts/${account.id}/phone-numbers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ phoneNumber: "+15551234567" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { phoneNumber: string; ownerId: string; ownerType: string } };
    expect(body.data.phoneNumber).toBe("+15551234567");
    expect(body.data.ownerId).toBe(account.id);
    expect(body.data.ownerType).toBe("account");
  });
});

describe("POST /api/accounts/:id/humans", () => {
  it("links human to account and returns 201", async () => {
    const db = getDb();
    const account = buildAccount();
    const human = buildHuman();
    await db.insert(schema.accounts).values(account);
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/accounts/${account.id}/humans`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { accountId: string; humanId: string } };
    expect(body.data.accountId).toBe(account.id);
    expect(body.data.humanId).toBe(human.id);
  });
});
