import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listDocuments,
  createDocument,
  deleteDocument,
} from "../../../src/services/documents";
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

async function seedDocument(
  db: ReturnType<typeof getTestDb>,
  id: string,
  overrides: Partial<{
    key: string;
    filename: string;
    contentType: string;
    sizeBytes: number;
    entityType: string;
    entityId: string;
    uploadedBy: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.documents).values({
    id,
    displayId: nextDisplayId("DOC"),
    key: overrides.key ?? `uploads/${id}/file.pdf`,
    filename: overrides.filename ?? "file.pdf",
    contentType: overrides.contentType ?? "application/pdf",
    sizeBytes: overrides.sizeBytes ?? 1024,
    entityType: overrides.entityType ?? "agreement",
    entityId: overrides.entityId ?? "agr-1",
    uploadedBy: overrides.uploadedBy ?? null,
    createdAt: ts,
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
// listDocuments
// ---------------------------------------------------------------------------

describe("listDocuments", () => {
  it("returns empty list when no documents exist", async () => {
    const db = getTestDb();
    const result = await listDocuments(db, "agreement", "agr-1");
    expect(result).toHaveLength(0);
  });

  it("returns documents filtered by entityType and entityId", async () => {
    const db = getTestDb();
    await seedDocument(db, "doc-1", {
      key: "uploads/agr-1/contract.pdf",
      filename: "contract.pdf",
      entityType: "agreement",
      entityId: "agr-1",
    });
    await seedDocument(db, "doc-2", {
      key: "uploads/agr-1/addendum.pdf",
      filename: "addendum.pdf",
      entityType: "agreement",
      entityId: "agr-1",
    });

    const result = await listDocuments(db, "agreement", "agr-1");
    expect(result).toHaveLength(2);

    const filenames = result.map((d) => d.filename);
    expect(filenames).toContain("contract.pdf");
    expect(filenames).toContain("addendum.pdf");
  });

  it("does not return documents for a different entity", async () => {
    const db = getTestDb();
    await seedDocument(db, "doc-1", { entityType: "agreement", entityId: "agr-1" });
    await seedDocument(db, "doc-2", { entityType: "agreement", entityId: "agr-2" });
    await seedDocument(db, "doc-3", { entityType: "human", entityId: "agr-1" });

    const result = await listDocuments(db, "agreement", "agr-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("doc-1");
  });
});

// ---------------------------------------------------------------------------
// createDocument
// ---------------------------------------------------------------------------

describe("createDocument", () => {
  it("creates a document with all fields", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "DOC", counter: 0 });

    const result = await createDocument(db, {
      key: "uploads/agr-1/contract.pdf",
      filename: "contract.pdf",
      contentType: "application/pdf",
      sizeBytes: 2048,
      entityType: "agreement",
      entityId: "agr-1",
      uploadedBy: null,
    });

    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^DOC-/);
    expect(result.key).toBe("uploads/agr-1/contract.pdf");
    expect(result.filename).toBe("contract.pdf");
    expect(result.contentType).toBe("application/pdf");
    expect(result.sizeBytes).toBe(2048);
    expect(result.entityType).toBe("agreement");
    expect(result.entityId).toBe("agr-1");
    expect(result.uploadedBy).toBeNull();
    expect(result.createdAt).toBeDefined();

    const rows = await db.select().from(schema.documents);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.key).toBe("uploads/agr-1/contract.pdf");
    expect(rows[0]!.filename).toBe("contract.pdf");
  });

  it("generates unique display IDs (DOC prefix)", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "DOC", counter: 0 });

    const r1 = await createDocument(db, {
      key: "uploads/agr-1/first.pdf",
      filename: "first.pdf",
      contentType: "application/pdf",
      sizeBytes: 100,
      entityType: "agreement",
      entityId: "agr-1",
    });

    const r2 = await createDocument(db, {
      key: "uploads/agr-1/second.pdf",
      filename: "second.pdf",
      contentType: "application/pdf",
      sizeBytes: 200,
      entityType: "agreement",
      entityId: "agr-1",
    });

    expect(r1.displayId).toMatch(/^DOC-/);
    expect(r2.displayId).toMatch(/^DOC-/);
    expect(r1.displayId).not.toBe(r2.displayId);
  });

  it("stores uploadedBy when provided", async () => {
    const db = getTestDb();
    await db.insert(schema.displayIdCounters).values({ prefix: "DOC", counter: 0 });

    const ts = now();
    await db.insert(schema.colleagues).values({
      id: "col-1",
      displayId: nextDisplayId("COL"),
      email: "uploader@example.com",
      firstName: "Upload",
      lastName: "User",
      name: "Upload User",
      role: "agent",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await createDocument(db, {
      key: "uploads/agr-1/signed.pdf",
      filename: "signed.pdf",
      contentType: "application/pdf",
      sizeBytes: 512,
      entityType: "agreement",
      entityId: "agr-1",
      uploadedBy: "col-1",
    });

    expect(result.uploadedBy).toBe("col-1");
  });
});

// ---------------------------------------------------------------------------
// deleteDocument
// ---------------------------------------------------------------------------

describe("deleteDocument", () => {
  it("throws notFound for missing document", async () => {
    const db = getTestDb();
    const r2 = mockR2();
    await expect(deleteDocument(db, r2, "nonexistent")).rejects.toThrowError("Document not found");
  });

  it("deletes document from database", async () => {
    const db = getTestDb();
    await seedDocument(db, "doc-1", { key: "uploads/agr-1/contract.pdf" });
    const r2 = mockR2();

    await deleteDocument(db, r2, "doc-1");

    const rows = await db.select().from(schema.documents);
    expect(rows).toHaveLength(0);
  });

  it("calls R2 delete with the correct key", async () => {
    const db = getTestDb();
    await seedDocument(db, "doc-1", { key: "uploads/agr-1/specific-key.pdf" });
    const r2 = mockR2();

    await deleteDocument(db, r2, "doc-1");

    const deleted = (r2 as unknown as { _deleted: string[] })._deleted;
    expect(deleted).toHaveLength(1);
    expect(deleted[0]).toBe("uploads/agr-1/specific-key.pdf");
  });

  it("deletes only the targeted document, leaving others intact", async () => {
    const db = getTestDb();
    await seedDocument(db, "doc-1", { key: "uploads/keep.pdf", entityId: "agr-1" });
    await seedDocument(db, "doc-2", { key: "uploads/gone.pdf", entityId: "agr-1" });
    const r2 = mockR2();

    await deleteDocument(db, r2, "doc-2");

    const rows = await db.select().from(schema.documents);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("doc-1");

    const deleted = (r2 as unknown as { _deleted: string[] })._deleted;
    expect(deleted).toContain("uploads/gone.pdf");
    expect(deleted).not.toContain("uploads/keep.pdf");
  });
});
