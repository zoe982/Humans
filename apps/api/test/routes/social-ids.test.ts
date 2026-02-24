/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildConfigItem } from "@humans/test-utils";
import { createId } from "@humans/db";

const BASE = "http://localhost/api/social-ids";

function jsonHeaders(token: string) {
  return { "Content-Type": "application/json", Cookie: sessionCookie(token) };
}

async function seedDisplayIdCounter() {
  const db = getDb();
  await db.insert(schema.displayIdCounters).values({ prefix: "SOC", counter: 0 }).onConflictDoNothing();
}

function buildSocialIdRecord(overrides: Partial<{
  id: string;
  displayId: string;
  handle: string;
  platformId: string | null;
  humanId: string | null;
  accountId: string | null;
  createdAt: string;
}> = {}) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    displayId: `SOC-AAA-${String(Math.floor(Math.random() * 900) + 100)}`,
    handle: `@testhandle-${createId().slice(0, 6)}`,
    platformId: null,
    humanId: null,
    accountId: null,
    createdAt: now,
    ...overrides,
  };
}

// ─── GET /api/social-ids ──────────────────────────────────────────

describe("GET /api/social-ids", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no social IDs exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of social IDs with resolved human name", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Jane", lastName: "Smith" });
    await db.insert(schema.humans).values(human);

    const platform = buildConfigItem({ name: "Instagram" });
    await db.insert(schema.socialIdPlatformsConfig).values(platform);

    const socialId = buildSocialIdRecord({ humanId: human.id, platformId: platform.id, handle: "@janesmith" });
    await db.insert(schema.socialIds).values(socialId);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; handle: string; humanName: string | null; platformName: string | null }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(socialId.id);
    expect(body.data[0].handle).toBe("@janesmith");
    expect(body.data[0].humanName).toBe("Jane Smith");
    expect(body.data[0].platformName).toBe("Instagram");
  });
});

// ─── GET /api/social-ids/:id ──────────────────────────────────────

describe("GET /api/social-ids/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE}/nonexistent`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent social ID", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE}/nonexistent`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns social ID by id with resolved names", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Carlos", lastName: "Rivera" });
    await db.insert(schema.humans).values(human);

    const platform = buildConfigItem({ name: "Twitter" });
    await db.insert(schema.socialIdPlatformsConfig).values(platform);

    const socialId = buildSocialIdRecord({ humanId: human.id, platformId: platform.id, handle: "@crivera" });
    await db.insert(schema.socialIds).values(socialId);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${socialId.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; handle: string; humanName: string | null; platformName: string | null } };
    expect(body.data.id).toBe(socialId.id);
    expect(body.data.handle).toBe("@crivera");
    expect(body.data.humanName).toBe("Carlos Rivera");
    expect(body.data.platformName).toBe("Twitter");
  });
});

// ─── POST /api/social-ids ─────────────────────────────────────────

describe("POST /api/social-ids", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "@newhandle" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ handle: "@blocked" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates social ID and returns 201", async () => {
    await seedDisplayIdCounter();
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ handle: "@newuser", humanId: human.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; handle: string; humanId: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.handle).toBe("@newuser");
    expect(body.data.humanId).toBe(human.id);
  });

  it("returns 400 for invalid data (empty handle)", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ handle: "" }),
    });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/social-ids/:id ────────────────────────────────────

describe("PATCH /api/social-ids/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE}/nonexistent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "@updated" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const db = getDb();
    const socialId = buildSocialIdRecord();
    await db.insert(schema.socialIds).values(socialId);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE}/${socialId.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ handle: "@blocked" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent social ID", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/nonexistent`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ handle: "@updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates social ID handle successfully", async () => {
    const db = getDb();
    const socialId = buildSocialIdRecord({ handle: "@original" });
    await db.insert(schema.socialIds).values(socialId);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${socialId.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ handle: "@updated" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; handle: string } };
    expect(body.data.id).toBe(socialId.id);
    expect(body.data.handle).toBe("@updated");
  });
});

// ─── DELETE /api/social-ids/:id ───────────────────────────────────

describe("DELETE /api/social-ids/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE}/nonexistent`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const db = getDb();
    const socialId = buildSocialIdRecord();
    await db.insert(schema.socialIds).values(socialId);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE}/${socialId.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent social ID", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/nonexistent`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes social ID successfully", async () => {
    const db = getDb();
    const socialId = buildSocialIdRecord({ handle: "@todelete" });
    await db.insert(schema.socialIds).values(socialId);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${socialId.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify it is gone
    const getRes = await SELF.fetch(`${BASE}/${socialId.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(getRes.status).toBe(404);
  });
});
