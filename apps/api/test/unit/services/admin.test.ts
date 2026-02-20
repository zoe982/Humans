import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listColleagues,
  getColleague,
  createColleague,
  updateColleague,
  listAuditLog,
} from "../../../src/services/admin";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

async function seedColleague(
  db: ReturnType<typeof getTestDb>,
  id = "col-1",
  overrides: Partial<{
    email: string;
    firstName: string;
    middleNames: string | null;
    lastName: string;
    name: string;
    role: string;
  }> = {},
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    displayId: `COL-${String(seedCounter).padStart(6, "0")}`,
    email: overrides.email ?? `${id}@test.com`,
    firstName: overrides.firstName ?? "Test",
    middleNames: overrides.middleNames ?? null,
    lastName: overrides.lastName ?? "User",
    name: overrides.name ?? "Test User",
    role: overrides.role ?? "admin",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

// ─── listColleagues ──────────────────────────────────────────────────────────

describe("listColleagues", () => {
  it("returns empty list when no colleagues", async () => {
    const db = getTestDb();
    const result = await listColleagues(db);
    expect(result).toHaveLength(0);
  });

  it("returns all colleagues", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2", { email: "col-2@test.com", firstName: "Jane", name: "Jane User" });

    const result = await listColleagues(db);
    expect(result).toHaveLength(2);
  });
});

// ─── getColleague ────────────────────────────────────────────────────────────

describe("getColleague", () => {
  it("throws notFound for missing colleague", async () => {
    const db = getTestDb();
    await expect(getColleague(db, "nonexistent")).rejects.toThrowError("Colleague not found");
  });

  it("returns colleague by id", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1", { firstName: "Alice", lastName: "Smith", name: "Alice Smith" });

    const result = await getColleague(db, "col-1");
    expect(result.id).toBe("col-1");
    expect(result.firstName).toBe("Alice");
    expect(result.lastName).toBe("Smith");
  });
});

// ─── createColleague ─────────────────────────────────────────────────────────

describe("createColleague", () => {
  it("creates colleague with computed display name", async () => {
    const db = getTestDb();

    const result = await createColleague(db, {
      email: "alice@test.com",
      firstName: "Alice",
      middleNames: "Marie",
      lastName: "Smith",
      role: "viewer",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Alice Marie Smith");
    expect(result.role).toBe("viewer");

    const rows = await db.select().from(schema.colleagues);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Alice Marie Smith");
  });

  it("throws conflict for duplicate email", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1", { email: "taken@test.com" });

    await expect(
      createColleague(db, {
        email: "taken@test.com",
        firstName: "Other",
        lastName: "Person",
        role: "viewer",
      }),
    ).rejects.toThrowError("Colleague with this email already exists");
  });
});

// ─── updateColleague ─────────────────────────────────────────────────────────

describe("updateColleague", () => {
  it("throws notFound for missing colleague", async () => {
    const db = getTestDb();
    await expect(
      updateColleague(db, "nonexistent", { firstName: "X" }),
    ).rejects.toThrowError("Colleague not found");
  });

  it("updates specified fields", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1", { firstName: "Old", lastName: "Name", name: "Old Name" });

    const result = await updateColleague(db, "col-1", { firstName: "New", role: "editor" });
    expect(result!.firstName).toBe("New");
    expect(result!.role).toBe("editor");
  });

  it("recalculates display name when name fields change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1", {
      firstName: "Alice",
      middleNames: null,
      lastName: "Smith",
      name: "Alice Smith",
    });

    const result = await updateColleague(db, "col-1", { middleNames: "Marie", lastName: "Jones" });
    expect(result!.name).toBe("Alice Marie Jones");
  });
});

// ─── listAuditLog ────────────────────────────────────────────────────────────

describe("listAuditLog", () => {
  it("returns empty list when no audit entries", async () => {
    const db = getTestDb();
    const result = await listAuditLog(db, 25, 0);
    expect(result).toHaveLength(0);
  });

  it("returns paginated audit entries", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const ts = now();
    for (let i = 0; i < 5; i++) {
      await db.insert(schema.auditLog).values({
        id: `aud-${i}`,
        colleagueId: "col-1",
        action: "UPDATE",
        entityType: "human",
        entityId: `h-${i}`,
        createdAt: ts,
      });
    }

    const page1 = await listAuditLog(db, 3, 0);
    expect(page1).toHaveLength(3);

    const page2 = await listAuditLog(db, 3, 3);
    expect(page2).toHaveLength(2);
  });
});
