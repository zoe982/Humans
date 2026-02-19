/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildPet } from "@humans/test-utils";

async function createHuman() {
  const db = getDb();
  const human = buildHuman();
  await db.insert(schema.humans).values(human);
  return human;
}

describe("GET /api/humans/:humanId/pets", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/humans/any/pets");
    expect(res.status).toBe(401);
  });

  it("returns pets for a human", async () => {
    const human = await createHuman();
    const db = getDb();
    const pet = buildPet({ humanId: human.id, name: "Buddy" });
    await db.insert(schema.pets).values(pet);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`http://localhost/api/humans/${human.id}/pets`, {
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
    const human = await createHuman();
    const db = getDb();
    const pet = buildPet({ humanId: human.id });
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
    const human = await createHuman();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id, name: "Fluffy" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates pet and returns 201", async () => {
    const human = await createHuman();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id, name: "Fluffy" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { name: string; humanId: string } };
    expect(body.data.name).toBe("Fluffy");
    expect(body.data.humanId).toBe(human.id);
  });

  it("returns 400 for invalid data (missing humanId)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Fluffy" }),
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
    const human = await createHuman();
    const db = getDb();
    const pet = buildPet({ humanId: human.id, name: "Old Name" });
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
