/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildClient, buildPet } from "@humans/test-utils";

async function createClient() {
  const db = getDb();
  const client = buildClient({ email: `pet-client-${Date.now()}@test.com` });
  await db.insert(schema.clients).values(client);
  return client;
}

describe("GET /api/clients/:clientId/pets", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/clients/any/pets");
    expect(res.status).toBe(401);
  });

  it("returns pets for a client", async () => {
    const client = await createClient();
    const db = getDb();
    const pet = buildPet({ clientId: client.id, name: "Buddy" });
    await db.insert(schema.pets).values(pet);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`http://localhost/api/clients/${client.id}/pets`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /api/pets/:id", () => {
  it("returns 404 for non-existent pet", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/pets/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns pet by id", async () => {
    const client = await createClient();
    const db = getDb();
    const pet = buildPet({ clientId: client.id });
    await db.insert(schema.pets).values(pet);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/pets/${pet.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe(pet.id);
  });
});

describe("POST /api/pets", () => {
  it("returns 403 for viewer role", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ clientId: client.id, name: "Fluffy" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates pet and returns 201", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ clientId: client.id, name: "Fluffy" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { name: string; clientId: string } };
    expect(body.data.name).toBe("Fluffy");
    expect(body.data.clientId).toBe(client.id);
  });

  it("returns 400 for invalid data (missing name)", async () => {
    const client = await createClient();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ clientId: client.id }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/pets/:id", () => {
  it("returns 404 for non-existent pet", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/pets/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates pet successfully", async () => {
    const client = await createClient();
    const db = getDb();
    const pet = buildPet({ clientId: client.id, name: "Old Name" });
    await db.insert(schema.pets).values(pet);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/pets/${pet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe("New Name");
  });
});
