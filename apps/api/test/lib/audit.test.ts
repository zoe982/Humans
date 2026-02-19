/// <reference types="@cloudflare/vitest-pool-workers" />
import { describe, it, expect } from "vitest";
import { computeDiff, logAuditEntry } from "../../src/lib/audit";
import { getDb, createUserAndSession } from "../helpers";
import * as schema from "@humans/db/schema";
import { eq } from "drizzle-orm";

describe("computeDiff", () => {
  it("returns null when no changes", () => {
    expect(computeDiff({ a: 1, b: "x" }, { a: 1, b: "x" })).toBeNull();
  });

  it("detects changed fields", () => {
    const diff = computeDiff({ a: 1, b: "old" }, { a: 1, b: "new" });
    expect(diff).not.toBeNull();
    expect(diff?.b).toStrictEqual({ old: "old", new: "new" });
  });

  it("treats undefined old values as null", () => {
    const diff = computeDiff({}, { a: "new" });
    expect(diff).not.toBeNull();
    expect(diff?.a).toStrictEqual({ old: null, new: "new" });
  });

  it("treats undefined new values as null", () => {
    const diff = computeDiff({ a: "old" }, { a: undefined });
    expect(diff).not.toBeNull();
    expect(diff?.a).toStrictEqual({ old: "old", new: null });
  });

  it("only includes changed keys", () => {
    const diff = computeDiff({ a: 1, b: 2, c: 3 }, { a: 1, b: 99, c: 3 });
    expect(diff).not.toBeNull();
    expect(Object.keys(diff ?? {})).toStrictEqual(["b"]);
  });
});

describe("logAuditEntry", () => {
  it("inserts audit entry and returns ID", async () => {
    const { user } = await createUserAndSession("admin");
    const db = getDb();
    const changes = { name: { old: "Old", new: "New" } };

    const id = await logAuditEntry({
      db,
      colleagueId: user.id,
      action: "update",
      entityType: "client",
      entityId: "c-1",
      changes,
    });

    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const entries = await db.select().from(schema.auditLog).where(eq(schema.auditLog.id, id));
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("update");
    expect(entries[0].entityType).toBe("client");
  });
});
