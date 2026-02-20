import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import { getAuditEntries, undoAuditEntry } from "../../../src/services/audit-log";
import * as schema from "@humans/db/schema";
import { eq } from "drizzle-orm";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    displayId: nextDisplayId("COL"),
    email: `${id}@test.com`,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    role: "admin",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: nextDisplayId("HUM"),
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedAccount(db: ReturnType<typeof getTestDb>, id = "acc-1", name = "Acme Corp") {
  const ts = now();
  await db.insert(schema.accounts).values({
    id,
    displayId: nextDisplayId("ACC"),
    name,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedAuditEntry(
  db: ReturnType<typeof getTestDb>,
  id: string,
  overrides: Partial<{
    colleagueId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    changes: Record<string, unknown> | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.auditLog).values({
    id,
    colleagueId: overrides.colleagueId ?? "col-1",
    action: overrides.action ?? "UPDATE",
    entityType: overrides.entityType ?? "human",
    entityId: overrides.entityId ?? "h-1",
    changes: overrides.changes ?? null,
    createdAt: ts,
  });
  return id;
}

// ─── getAuditEntries ─────────────────────────────────────────────────────────

describe("getAuditEntries", () => {
  it("returns entries with colleague names", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");

    await seedAuditEntry(db, "aud-1", {
      colleagueId: "col-1",
      entityType: "human",
      entityId: "h-1",
      changes: { firstName: { old: "Old", new: "New" } },
    });

    const entries = await getAuditEntries(db, "human", "h-1");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("aud-1");
    expect(entries[0]!.colleagueName).toBe("Test User");
    expect(entries[0]!.action).toBe("UPDATE");
  });

  it("returns empty array when no entries exist", async () => {
    const db = getTestDb();
    const entries = await getAuditEntries(db, "human", "nonexistent");
    expect(entries).toHaveLength(0);
  });
});

// ─── undoAuditEntry ──────────────────────────────────────────────────────────

describe("undoAuditEntry", () => {
  it("throws notFound for missing audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await expect(undoAuditEntry(db, "nonexistent", "col-1")).rejects.toThrowError("Audit entry not found");
  });

  it("throws badRequest when changes are null", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedAuditEntry(db, "aud-1", { changes: null });

    await expect(undoAuditEntry(db, "aud-1", "col-1")).rejects.toThrowError("No changes to undo");
  });

  it("reverts human scalar fields", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "New", "Name");

    await seedAuditEntry(db, "aud-1", {
      entityType: "human",
      entityId: "h-1",
      changes: { firstName: { old: "Old", new: "New" } },
    });

    const result = await undoAuditEntry(db, "aud-1", "col-1");
    expect(result.undoEntryId).toBeDefined();

    const human = await db.query.humans.findFirst({ where: eq(schema.humans.id, "h-1") });
    expect(human!.firstName).toBe("Old");
  });

  it("reverts human types", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    // Current state: pet_shipper
    await db.insert(schema.humanTypes).values({
      id: "ht-1", humanId: "h-1", type: "pet_shipper", createdAt: ts,
    });

    // Audit says types changed from ["flight_broker"] to ["pet_shipper"]
    await seedAuditEntry(db, "aud-1", {
      entityType: "human",
      entityId: "h-1",
      changes: { types: { old: ["flight_broker"], new: ["pet_shipper"] } },
    });

    await undoAuditEntry(db, "aud-1", "col-1");

    const types = await db.select().from(schema.humanTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe("flight_broker");
  });

  it("reverts account scalar fields", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedAccount(db, "acc-1", "New Name");

    await seedAuditEntry(db, "aud-1", {
      entityType: "account",
      entityId: "acc-1",
      changes: { name: { old: "Old Name", new: "New Name" } },
    });

    await undoAuditEntry(db, "aud-1", "col-1");

    const account = await db.query.accounts.findFirst({ where: eq(schema.accounts.id, "acc-1") });
    expect(account!.name).toBe("Old Name");
  });

  it("reverts account typeIds", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedAccount(db, "acc-1");

    await db.insert(schema.accountTypesConfig).values({ id: "atc-1", name: "Airline", createdAt: ts });
    await db.insert(schema.accountTypesConfig).values({ id: "atc-2", name: "Broker", createdAt: ts });

    // Current state: atc-2
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "atc-2", createdAt: ts,
    });

    // Audit says typeIds changed from ["atc-1"] to ["atc-2"]
    await seedAuditEntry(db, "aud-1", {
      entityType: "account",
      entityId: "acc-1",
      changes: { typeIds: { old: ["atc-1"], new: ["atc-2"] } },
    });

    await undoAuditEntry(db, "aud-1", "col-1");

    const accountTypes = await db.select().from(schema.accountTypes);
    expect(accountTypes).toHaveLength(1);
    expect(accountTypes[0]!.typeId).toBe("atc-1");
  });

  it("throws badRequest for unsupported entity type", async () => {
    const db = getTestDb();
    await seedColleague(db);

    await seedAuditEntry(db, "aud-1", {
      entityType: "pet",
      entityId: "p-1",
      changes: { name: { old: "Fido", new: "Rex" } },
    });

    await expect(undoAuditEntry(db, "aud-1", "col-1")).rejects.toThrowError(
      "Undo not supported for entity type: pet",
    );
  });

  it("logs an undo audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "New", "Name");

    await seedAuditEntry(db, "aud-1", {
      entityType: "human",
      entityId: "h-1",
      changes: { firstName: { old: "Old", new: "New" } },
    });

    const result = await undoAuditEntry(db, "aud-1", "col-1");

    const allEntries = await db.select().from(schema.auditLog);
    // Original entry + undo entry
    expect(allEntries).toHaveLength(2);

    const undoEntry = allEntries.find((e) => e.id === result.undoEntryId);
    expect(undoEntry).toBeDefined();
    expect(undoEntry!.action).toBe("UNDO");
    expect(undoEntry!.entityType).toBe("human");
    expect(undoEntry!.entityId).toBe("h-1");
  });
});
