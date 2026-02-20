/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildPhoneNumber } from "@humans/test-utils";

describe("GET /api/phone-numbers", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/phone-numbers");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no phone numbers exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/phone-numbers", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of phone numbers with human names", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Alice", lastName: "Smith" });
    await db.insert(schema.humans).values(human);
    const phone = buildPhoneNumber({ ownerType: "human", ownerId: human.id, phoneNumber: "+15551234567" });
    await db.insert(schema.phones).values(phone);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/phone-numbers", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { phoneNumber: string; ownerName: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ownerName).toBe("Alice Smith");
  });
});

describe("POST /api/phone-numbers", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/phone-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: "some-id", phoneNumber: "+15551234567" }),
    });
    expect(res.status).toBe(403);
  });

  it("adds phone number to human and returns 201", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/phone-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id, phoneNumber: "+15559876543" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { phoneNumber: string; ownerId: string; ownerType: string } };
    expect(body.data.phoneNumber).toBe("+15559876543");
    expect(body.data.ownerId).toBe(human.id);
    expect(body.data.ownerType).toBe("human");
  });

  it("returns 400 for missing phone number", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/phone-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: human.id, phoneNumber: "" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/phone-numbers/:id", () => {
  it("returns 404 for non-existent phone number", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/phone-numbers/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ phoneNumber: "+15550000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates phone number successfully", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const phone = buildPhoneNumber({ ownerType: "human", ownerId: human.id, phoneNumber: "+15551111111" });
    await db.insert(schema.phones).values(phone);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/phone-numbers/${phone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ phoneNumber: "+15552222222" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { phoneNumber: string } };
    expect(body.data.phoneNumber).toBe("+15552222222");
  });
});

describe("DELETE /api/phone-numbers/:id", () => {
  it("returns 404 for non-existent phone number", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/phone-numbers/nonexistent", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes phone number successfully", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const phone = buildPhoneNumber({ ownerType: "human", ownerId: human.id, phoneNumber: "+15553333333" });
    await db.insert(schema.phones).values(phone);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/phone-numbers/${phone.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
