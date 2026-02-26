/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { createId } from "@humans/db";

const CONFIG_TYPES = [
  "account-types",
  "account-human-labels",
  "account-email-labels",
  "account-phone-labels",
  "human-email-labels",
  "human-phone-labels",
] as const;

const ALL_CONFIG_TYPES = [
  "account-types",
  "account-human-labels",
  "account-email-labels",
  "account-phone-labels",
  "human-email-labels",
  "human-phone-labels",
  "social-id-platforms",
  "opportunity-human-roles",
  "human-relationship-labels",
  "agreement-types",
  "lead-sources",
  "lead-channels",
] as const;

describe("GET /api/admin/account-config/batch", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/account-config/batch");
    expect(res.status).toBe(401);
  });

  it("returns all config types when no types param provided", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/batch", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown[]> };
    expect(Object.keys(body.data).sort()).toEqual([...ALL_CONFIG_TYPES].sort());
    for (const type of ALL_CONFIG_TYPES) {
      expect(Array.isArray(body.data[type])).toBe(true);
    }
  });

  it("returns only requested types when types param provided", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(
      "http://localhost/api/admin/account-config/batch?types=account-types,human-email-labels",
      { headers: { Cookie: sessionCookie(token) } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown[]> };
    expect(Object.keys(body.data).sort()).toEqual(["account-types", "human-email-labels"]);
  });

  it("returns 400 if any type is invalid", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(
      "http://localhost/api/admin/account-config/batch?types=account-types,not-real",
      { headers: { Cookie: sessionCookie(token) } },
    );
    expect(res.status).toBe(400);
  });

  it("returns empty arrays for types with no data", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(
      "http://localhost/api/admin/account-config/batch?types=account-types",
      { headers: { Cookie: sessionCookie(token) } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown[]> };
    expect(body.data["account-types"]).toEqual([]);
  });

  it("returns seeded data for requested types", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(schema.accountTypesConfig).values({ id: createId(), name: "Batch Type A", createdAt: now });
    await db.insert(schema.humanEmailLabelsConfig).values({ id: createId(), name: "Batch Email", createdAt: now });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(
      "http://localhost/api/admin/account-config/batch?types=account-types,human-email-labels",
      { headers: { Cookie: sessionCookie(token) } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, Array<{ name: string }>> };
    expect(body.data["account-types"].length).toBeGreaterThanOrEqual(1);
    expect(body.data["account-types"].some((item) => item.name === "Batch Type A")).toBe(true);
    expect(body.data["human-email-labels"].some((item) => item.name === "Batch Email")).toBe(true);
  });
});

describe("GET /api/admin/account-config/:configType", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types");
    expect(res.status).toBe(401);
  });

  it("returns 200 for agent role (GET uses viewRecords permission)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });

  it("returns 200 for manager role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });

  it("returns 200 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid config type", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/invalid-type", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("returns empty array when no config items exist", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns config items for account-types", async () => {
    const db = getDb();
    const now = new Date().toISOString();
    await db.insert(schema.accountTypesConfig).values({ id: createId(), name: "Type A", createdAt: now });
    await db.insert(schema.accountTypesConfig).values({ id: createId(), name: "Type B", createdAt: now });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ name: string }> };
    expect(body.data).toHaveLength(2);
  });

  for (const configType of CONFIG_TYPES) {
    it(`returns 200 for valid config type: ${configType}`, async () => {
      const { token } = await createUserAndSession("admin");
      const res = await SELF.fetch(`http://localhost/api/admin/account-config/${configType}`, {
        headers: { Cookie: sessionCookie(token) },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: unknown[] };
      expect(Array.isArray(body.data)).toBe(true);
    });
  }
});

describe("POST /api/admin/account-config/:configType", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Type" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Test Type" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid config type", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/bad-type", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Test Type" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a config item and returns 201", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "New Account Type" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; name: string; createdAt: string } };
    expect(body.data.name).toBe("New Account Type");
    expect(body.data.id).toBeTruthy();
    expect(body.data.createdAt).toBeTruthy();
  });

  it("creates config items for human-email-labels", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/human-email-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Work Email" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe("Work Email");
  });

  it("creates config items for human-phone-labels", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/human-phone-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Mobile" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe("Mobile");
  });

  it("returns error for missing name field", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({}),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe("PATCH /api/admin/account-config/:configType/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin role", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid config type", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/not-a-type/some-id", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Updated" }),
    });
    expect(res.status).toBe(400);
  });

  it("updates a config item successfully", async () => {
    const db = getDb();
    const itemId = createId();
    const now = new Date().toISOString();
    await db.insert(schema.accountTypesConfig).values({ id: itemId, name: "Original", createdAt: now });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`http://localhost/api/admin/account-config/account-types/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify the update persisted
    const verifyRes = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    const verifyBody = (await verifyRes.json()) as { data: Array<{ id: string; name: string }> };
    const updated = verifyBody.data.find((item) => item.id === itemId);
    expect(updated?.name).toBe("Renamed");
  });
});

describe("DELETE /api/admin/account-config/:configType/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types/some-id", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin role", async () => {
    const { token } = await createUserAndSession("manager");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid config type", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/invalid/some-id", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("deletes a config item successfully", async () => {
    const db = getDb();
    const itemId = createId();
    const now = new Date().toISOString();
    await db.insert(schema.accountTypesConfig).values({ id: itemId, name: "To Delete", createdAt: now });

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`http://localhost/api/admin/account-config/account-types/${itemId}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify the item was deleted
    const verifyRes = await SELF.fetch("http://localhost/api/admin/account-config/account-types", {
      headers: { Cookie: sessionCookie(token) },
    });
    const verifyBody = (await verifyRes.json()) as { data: Array<{ id: string }> };
    expect(verifyBody.data.find((item) => item.id === itemId)).toBeUndefined();
  });

  it("returns 200 even when deleting non-existent item (idempotent)", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/account-config/account-types/does-not-exist", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
