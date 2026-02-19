/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildColleague } from "@humans/test-utils";
import { createId } from "@humans/db";

describe("GET /api/audit-log", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/audit-log?entityType=human&entityId=test-id");
    expect(res.status).toBe(401);
  });

  it("returns 400 when entityType is missing", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/audit-log?entityId=test-id", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when entityId is missing", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/audit-log?entityType=human", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when both entityType and entityId are missing", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/audit-log", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("returns empty array when no audit entries exist for entity", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/audit-log?entityType=human&entityId=nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns audit entries for a specific entity", async () => {
    const db = getDb();
    const { user } = await createUserAndSession("admin");

    const human = buildHuman({ firstName: "Audited", lastName: "Human" });
    await db.insert(schema.humans).values(human);

    const entryId = createId();
    const now = new Date().toISOString();
    await db.insert(schema.auditLog).values({
      id: entryId,
      colleagueId: user.id,
      action: "UPDATE",
      entityType: "human",
      entityId: human.id,
      changes: JSON.stringify({ firstName: { old: "Old", new: "Audited" } }),
      createdAt: now,
    });

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(
      `http://localhost/api/audit-log?entityType=human&entityId=${human.id}`,
      { headers: { Cookie: sessionCookie(token) } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string;
        changes: unknown;
        colleagueId: string | null;
        colleagueName: string | null;
      }>;
    };
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const entry = body.data.find((e) => e.id === entryId);
    expect(entry).toBeTruthy();
    expect(entry!.action).toBe("UPDATE");
    expect(entry!.entityType).toBe("human");
    expect(entry!.entityId).toBe(human.id);
  });

  it("viewer can access audit log (viewRecords permission)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/audit-log?entityType=human&entityId=any", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });

  it("agent can access audit log", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/audit-log?entityType=human&entityId=any", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/audit-log/:id/undo", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/audit-log/some-id/undo", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role (requires createEditRecords)", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/audit-log/some-id/undo", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when audit entry does not exist", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/audit-log/nonexistent-entry/undo", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when audit entry has no changes to undo", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");

    const entryId = createId();
    await db.insert(schema.auditLog).values({
      id: entryId,
      colleagueId: user.id,
      action: "CREATE",
      entityType: "human",
      entityId: createId(),
      changes: null,
      createdAt: new Date().toISOString(),
    });

    const res = await SELF.fetch(`http://localhost/api/audit-log/${entryId}/undo`, {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("successfully undoes a human update", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");

    const human = buildHuman({ firstName: "New", lastName: "Name" });
    await db.insert(schema.humans).values(human);

    const entryId = createId();
    const changes = {
      firstName: { old: "Original", new: "New" },
    };
    await db.insert(schema.auditLog).values({
      id: entryId,
      colleagueId: user.id,
      action: "UPDATE",
      entityType: "human",
      entityId: human.id,
      changes: changes as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    });

    const res = await SELF.fetch(`http://localhost/api/audit-log/${entryId}/undo`, {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { undoEntryId: string } };
    expect(body.data.undoEntryId).toBeTruthy();

    // Verify the human was reverted
    const updatedHumans = await db.select().from(schema.humans);
    const reverted = updatedHumans.find((h) => h.id === human.id);
    expect(reverted?.firstName).toBe("Original");
  });

  it("returns 400 when entity type is unsupported for undo", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");

    const entryId = createId();
    const changes = { someField: { old: "a", new: "b" } };
    await db.insert(schema.auditLog).values({
      id: entryId,
      colleagueId: user.id,
      action: "UPDATE",
      entityType: "flight",
      entityId: createId(),
      changes: changes as Record<string, unknown>,
      createdAt: new Date().toISOString(),
    });

    const res = await SELF.fetch(`http://localhost/api/audit-log/${entryId}/undo`, {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });
});
