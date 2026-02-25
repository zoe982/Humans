import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  deleteAgreement,
} from "../../../src/services/agreements";
import * as schema from "@humans/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedColleague(
  db: ReturnType<typeof getTestDb>,
  id = "col-1",
  email = "test@example.com",
) {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    displayId: nextDisplayId("COL"),
    email,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    role: "admin",
    isActive: 1,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedHuman(
  db: ReturnType<typeof getTestDb>,
  id = "h-1",
  first = "John",
  last = "Doe",
) {
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

async function seedAccount(
  db: ReturnType<typeof getTestDb>,
  id = "acc-1",
  name = "Test Corp",
) {
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

async function seedAgreementType(
  db: ReturnType<typeof getTestDb>,
  id = "atype-1",
  name = "Service Agreement",
) {
  const ts = now();
  await db.insert(schema.agreementTypesConfig).values({
    id,
    name,
    createdAt: ts,
  });
  return id;
}

async function seedAgreement(
  db: ReturnType<typeof getTestDb>,
  id = "agr-1",
  overrides: Partial<{
    title: string;
    typeId: string | null;
    status: "open" | "active" | "closed_inactive";
    activationDate: string | null;
    notes: string | null;
    humanId: string | null;
    accountId: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.agreements).values({
    id,
    displayId: nextDisplayId("AGR"),
    title: overrides.title ?? "Test Agreement",
    typeId: overrides.typeId ?? null,
    status: overrides.status ?? "open",
    activationDate: overrides.activationDate ?? null,
    notes: overrides.notes ?? null,
    humanId: overrides.humanId ?? null,
    accountId: overrides.accountId ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

function mockR2(): R2Bucket {
  const deleted: string[] = [];
  const bucket = {
    delete: async (key: string) => {
      deleted.push(key);
    },
    _deleted: deleted,
  };
  return bucket as unknown as R2Bucket;
}

// ---------------------------------------------------------------------------
// listAgreements
// ---------------------------------------------------------------------------

describe("listAgreements", () => {
  it("returns empty list when no agreements exist", async () => {
    const db = getTestDb();
    const result = await listAgreements(db, 1, 20, {});
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("returns agreements with resolved type name", async () => {
    const db = getTestDb();
    await seedAgreementType(db, "atype-1", "NDA");
    await seedAgreement(db, "agr-1", { title: "My NDA", typeId: "atype-1" });

    const result = await listAgreements(db, 1, 20, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.title).toBe("My NDA");
    expect(result.data[0]!.typeName).toBe("NDA");
  });

  it("returns agreements with resolved human name", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Walker");
    await seedAgreement(db, "agr-1", { humanId: "h-1" });

    const result = await listAgreements(db, 1, 20, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.humanName).toBe("Alice Walker");
    expect(result.data[0]!.humanDisplayId).toMatch(/^HUM-/);
    expect(result.data[0]!.accountName).toBeNull();
  });

  it("returns agreements with resolved account name", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedAgreement(db, "agr-1", { accountId: "acc-1" });

    const result = await listAgreements(db, 1, 20, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.accountName).toBe("Acme Corp");
    expect(result.data[0]!.accountDisplayId).toMatch(/^ACC-/);
    expect(result.data[0]!.humanName).toBeNull();
  });

  it("filters by humanId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedHuman(db, "h-2", "Carol", "Smith");
    await seedAgreement(db, "agr-1", { humanId: "h-1" });
    await seedAgreement(db, "agr-2", { humanId: "h-2" });

    const result = await listAgreements(db, 1, 20, { humanId: "h-1" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.humanName).toBe("Bob Jones");
  });

  it("filters by accountId", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Alpha Inc");
    await seedAccount(db, "acc-2", "Beta Ltd");
    await seedAgreement(db, "agr-1", { accountId: "acc-1" });
    await seedAgreement(db, "agr-2", { accountId: "acc-2" });

    const result = await listAgreements(db, 1, 20, { accountId: "acc-2" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.accountName).toBe("Beta Ltd");
  });

  it("filters by status", async () => {
    const db = getTestDb();
    await seedAgreement(db, "agr-1", { status: "open" });
    await seedAgreement(db, "agr-2", { status: "active" });
    await seedAgreement(db, "agr-3", { status: "closed_inactive" });

    const result = await listAgreements(db, 1, 20, { status: "active" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.status).toBe("active");
  });

  it("paginates results correctly", async () => {
    const db = getTestDb();
    await seedAgreement(db, "agr-1", { title: "Agreement One" });
    await seedAgreement(db, "agr-2", { title: "Agreement Two" });
    await seedAgreement(db, "agr-3", { title: "Agreement Three" });

    const page1 = await listAgreements(db, 1, 2, {});
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.total).toBe(3);
    expect(page1.meta.page).toBe(1);
    expect(page1.meta.limit).toBe(2);

    const page2 = await listAgreements(db, 2, 2, {});
    expect(page2.data).toHaveLength(1);
    expect(page2.meta.total).toBe(3);
    expect(page2.meta.page).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getAgreement
// ---------------------------------------------------------------------------

describe("getAgreement", () => {
  it("throws notFound for missing agreement", async () => {
    const db = getTestDb();
    await expect(getAgreement(db, "nonexistent")).rejects.toThrowError("Agreement not found");
  });

  it("returns agreement with resolved type/human/account names", async () => {
    const db = getTestDb();
    await seedAgreementType(db, "atype-1", "Partnership");
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedAccount(db, "acc-1", "Dan's Biz");
    await seedAgreement(db, "agr-1", {
      title: "Full Agreement",
      typeId: "atype-1",
      humanId: "h-1",
      accountId: "acc-1",
    });

    const result = await getAgreement(db, "agr-1");
    expect(result.id).toBe("agr-1");
    expect(result.title).toBe("Full Agreement");
    expect(result.typeName).toBe("Partnership");
    expect(result.humanName).toBe("Dan Brown");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.accountName).toBe("Dan's Biz");
    expect(result.accountDisplayId).toMatch(/^ACC-/);
  });

  it("returns agreement with null enrichment when no type/human/account", async () => {
    const db = getTestDb();
    await seedAgreement(db, "agr-1", { title: "Bare Agreement" });

    const result = await getAgreement(db, "agr-1");
    expect(result.id).toBe("agr-1");
    expect(result.title).toBe("Bare Agreement");
    expect(result.typeName).toBeNull();
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.accountDisplayId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createAgreement
// ---------------------------------------------------------------------------

describe("createAgreement", () => {
  it("creates agreement with minimal data (title only)", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "AGR", counter: 0 });
    await seedColleague(db, "col-1");

    const result = await createAgreement(db, { title: "Minimal Agreement" }, "col-1");

    expect(result.id).toBeDefined();
    expect(result.title).toBe("Minimal Agreement");
    expect(result.displayId).toMatch(/^AGR-/);
    expect(result.status).toBe("open");
    expect(result.typeId).toBeNull();
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.activationDate).toBeNull();

    const rows = await db.select().from(schema.agreements);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe("Minimal Agreement");
  });

  it("creates agreement with all fields", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "AGR", counter: 0 });
    await seedColleague(db, "col-1");
    await seedAgreementType(db, "atype-1", "SLA");
    await seedHuman(db, "h-1", "Eve", "Adams");
    await seedAccount(db, "acc-1", "Eve Corp");

    const result = await createAgreement(
      db,
      {
        title: "Full Agreement",
        typeId: "atype-1",
        status: "active",
        activationDate: "2026-01-01",
        notes: "Important notes",
        humanId: "h-1",
        accountId: "acc-1",
      },
      "col-1",
    );

    expect(result.title).toBe("Full Agreement");
    expect(result.typeId).toBe("atype-1");
    expect(result.status).toBe("active");
    expect(result.activationDate).toBe("2026-01-01");
    expect(result.notes).toBe("Important notes");
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBe("acc-1");
  });

  it("generates unique display IDs (AGR prefix)", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "AGR", counter: 0 });
    await seedColleague(db, "col-1");

    const r1 = await createAgreement(db, { title: "First" }, "col-1");
    const r2 = await createAgreement(db, { title: "Second" }, "col-1");

    expect(r1.displayId).toMatch(/^AGR-/);
    expect(r2.displayId).toMatch(/^AGR-/);
    expect(r1.displayId).not.toBe(r2.displayId);
  });

  it("creates audit log entry on create", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "AGR", counter: 0 });
    await seedColleague(db, "col-1");

    const result = await createAgreement(db, { title: "Audited Agreement" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("create");
    expect(auditRows[0]!.entityType).toBe("agreement");
    expect(auditRows[0]!.entityId).toBe(result.id);
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });

  it("defaults status to open when not provided", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "AGR", counter: 0 });
    await seedColleague(db, "col-1");

    const result = await createAgreement(db, { title: "Status Check" }, "col-1");
    expect(result.status).toBe("open");
  });
});

// ---------------------------------------------------------------------------
// updateAgreement
// ---------------------------------------------------------------------------

describe("updateAgreement", () => {
  it("throws notFound for missing agreement", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      updateAgreement(db, "nonexistent", { title: "New Title" }, "col-1"),
    ).rejects.toThrowError("Agreement not found");
  });

  it("updates title field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { title: "Old Title" });

    const result = await updateAgreement(db, "agr-1", { title: "New Title" }, "col-1");
    expect(result.title).toBe("New Title");
  });

  it("updates status field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { status: "open" });

    const result = await updateAgreement(db, "agr-1", { status: "active" }, "col-1");
    expect(result.status).toBe("active");
  });

  it("creates audit log entry on change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { title: "Before" });

    await updateAgreement(db, "agr-1", { title: "After" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("update");
    expect(auditRows[0]!.entityType).toBe("agreement");
    expect(auditRows[0]!.entityId).toBe("agr-1");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });

  it("returns updated agreement with resolved names", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Frank", "Zappa");
    await seedAgreement(db, "agr-1", { title: "Unlinked", humanId: "h-1" });

    const result = await updateAgreement(db, "agr-1", { title: "Linked" }, "col-1");
    expect(result.title).toBe("Linked");
    expect(result.humanName).toBe("Frank Zappa");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
  });
});

// ---------------------------------------------------------------------------
// deleteAgreement
// ---------------------------------------------------------------------------

describe("deleteAgreement", () => {
  it("throws notFound for missing agreement", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    const r2 = mockR2();

    await expect(
      deleteAgreement(db, "nonexistent", "col-1", r2),
    ).rejects.toThrowError("Agreement not found");
  });

  it("deletes the agreement", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { title: "To Delete" });
    const r2 = mockR2();

    await deleteAgreement(db, "agr-1", "col-1", r2);

    const rows = await db.select().from(schema.agreements);
    expect(rows).toHaveLength(0);
  });

  it("creates audit log entry on delete", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { title: "Deleted Agreement" });
    const r2 = mockR2();

    await deleteAgreement(db, "agr-1", "col-1", r2);

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("delete");
    expect(auditRows[0]!.entityType).toBe("agreement");
    expect(auditRows[0]!.entityId).toBe("agr-1");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });

  it("deletes linked documents from D1 and calls R2 delete for each", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { title: "With Docs" });

    const ts = now();
    await db.insert(schema.documents).values([
      {
        id: "doc-1",
        displayId: nextDisplayId("DOC"),
        key: "uploads/agr-1/contract.pdf",
        filename: "contract.pdf",
        contentType: "application/pdf",
        sizeBytes: 1024,
        entityType: "agreement",
        entityId: "agr-1",
        uploadedBy: null,
        createdAt: ts,
      },
      {
        id: "doc-2",
        displayId: nextDisplayId("DOC"),
        key: "uploads/agr-1/addendum.pdf",
        filename: "addendum.pdf",
        contentType: "application/pdf",
        sizeBytes: 512,
        entityType: "agreement",
        entityId: "agr-1",
        uploadedBy: null,
        createdAt: ts,
      },
    ]);

    const r2 = mockR2();

    await deleteAgreement(db, "agr-1", "col-1", r2);

    const docRows = await db.select().from(schema.documents);
    expect(docRows).toHaveLength(0);

    const deleted = (r2 as unknown as { _deleted: string[] })._deleted;
    expect(deleted).toContain("uploads/agr-1/contract.pdf");
    expect(deleted).toContain("uploads/agr-1/addendum.pdf");
    expect(deleted).toHaveLength(2);
  });

  it("deletes only the targeted agreement, leaving others intact", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedAgreement(db, "agr-1", { title: "Keep" });
    await seedAgreement(db, "agr-2", { title: "Gone" });
    const r2 = mockR2();

    await deleteAgreement(db, "agr-2", "col-1", r2);

    const rows = await db.select().from(schema.agreements);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("agr-1");
  });
});
