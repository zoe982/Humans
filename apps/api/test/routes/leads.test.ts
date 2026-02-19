/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildClient } from "@humans/test-utils";

async function createClient() {
  const db = getDb();
  const client = buildClient({ email: `leads-client-${Date.now()}@test.com` });
  await db.insert(schema.clients).values(client);
  return client;
}

describe("GET /api/leads/sources", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/leads/sources");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no sources exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/leads/sources", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });
});

describe("POST /api/leads/sources", () => {
  it("returns 403 for agent role (requires manageLeadSources)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/leads/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Facebook Ads", category: "paid" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates lead source and returns 201 for manager", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/leads/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Google Ads", category: "paid" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { name: string; isActive: boolean } };
    expect(body.data.name).toBe("Google Ads");
    expect(body.data.isActive).toBe(true);
  });

  it("returns 400 for invalid category", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/leads/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "X", category: "invalid-category" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/leads/events", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/leads/events");
    expect(res.status).toBe(401);
  });

  it("returns all events", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/leads/events", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("filters events by clientId", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/leads/events?clientId=${client.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });
});

describe("POST /api/leads/events", () => {
  it("returns 403 for viewer role (requires recordLeadEvents)", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/leads/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ clientId: client.id, eventType: "inquiry" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates lead event and returns 201", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/leads/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ clientId: client.id, eventType: "inquiry", notes: "First contact" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { clientId: string; eventType: string } };
    expect(body.data.clientId).toBe(client.id);
    expect(body.data.eventType).toBe("inquiry");
  });

  it("returns 400 for invalid event type", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/leads/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ clientId: client.id, eventType: "invalid-type" }),
    });
    expect(res.status).toBe(400);
  });
});
