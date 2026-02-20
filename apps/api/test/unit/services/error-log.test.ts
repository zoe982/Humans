import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listErrorLogEntries,
  getErrorLogEntry,
  cleanupErrorLog,
} from "../../../src/services/error-log";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function seedErrorEntry(
  db: ReturnType<typeof getTestDb>,
  id: string,
  overrides: Partial<{
    requestId: string;
    code: string;
    message: string;
    status: number;
    method: string;
    path: string;
    userId: string;
    details: string;
    stack: string;
    createdAt: string;
  }> = {},
) {
  const ts = overrides.createdAt ?? now();
  await db.insert(schema.errorLog).values({
    id,
    requestId: overrides.requestId ?? `req-${id}`,
    code: overrides.code ?? "INTERNAL_ERROR",
    message: overrides.message ?? "Something went wrong",
    status: overrides.status ?? 500,
    method: overrides.method ?? "GET",
    path: overrides.path ?? "/api/test",
    userId: overrides.userId ?? null,
    details: overrides.details ?? null,
    stack: overrides.stack ?? null,
    createdAt: ts,
  });
  return id;
}

describe("listErrorLogEntries", () => {
  it("returns empty list when no entries", async () => {
    const db = getTestDb();
    const result = await listErrorLogEntries(db, { limit: 25, offset: 0 });
    expect(result).toHaveLength(0);
  });

  it("returns entries ordered by createdAt descending", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "err-1", { createdAt: "2026-01-01T00:00:00Z" });
    await seedErrorEntry(db, "err-2", { createdAt: "2026-02-01T00:00:00Z" });
    await seedErrorEntry(db, "err-3", { createdAt: "2026-01-15T00:00:00Z" });

    const result = await listErrorLogEntries(db, { limit: 25, offset: 0 });
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe("err-2");
    expect(result[1]!.id).toBe("err-3");
    expect(result[2]!.id).toBe("err-1");
  });

  it("respects limit and offset", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "err-1", { createdAt: "2026-01-01T00:00:00Z" });
    await seedErrorEntry(db, "err-2", { createdAt: "2026-01-02T00:00:00Z" });
    await seedErrorEntry(db, "err-3", { createdAt: "2026-01-03T00:00:00Z" });

    const page1 = await listErrorLogEntries(db, { limit: 2, offset: 0 });
    expect(page1).toHaveLength(2);

    const page2 = await listErrorLogEntries(db, { limit: 2, offset: 2 });
    expect(page2).toHaveLength(1);
  });

  it("filters by code", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "err-1", { code: "INTERNAL_ERROR" });
    await seedErrorEntry(db, "err-2", { code: "VALIDATION_FAILED" });

    const result = await listErrorLogEntries(db, {
      limit: 25,
      offset: 0,
      code: "VALIDATION_FAILED",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.code).toBe("VALIDATION_FAILED");
  });

  it("filters by path", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "err-1", { path: "/api/humans" });
    await seedErrorEntry(db, "err-2", { path: "/api/flights" });

    const result = await listErrorLogEntries(db, {
      limit: 25,
      offset: 0,
      path: "/api/humans",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe("/api/humans");
  });

  it("filters by date range", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "err-1", { createdAt: "2026-01-01T00:00:00Z" });
    await seedErrorEntry(db, "err-2", { createdAt: "2026-01-15T00:00:00Z" });
    await seedErrorEntry(db, "err-3", { createdAt: "2026-02-01T00:00:00Z" });

    const result = await listErrorLogEntries(db, {
      limit: 25,
      offset: 0,
      dateFrom: "2026-01-10T00:00:00Z",
      dateTo: "2026-01-20T00:00:00Z",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("err-2");
  });
});

describe("getErrorLogEntry", () => {
  it("throws not found for missing entry", async () => {
    const db = getTestDb();
    await expect(
      getErrorLogEntry(db, "nonexistent"),
    ).rejects.toThrowError("Error log entry not found");
  });

  it("returns entry by id", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "err-1", {
      code: "INTERNAL_ERROR",
      message: "Oops",
      path: "/api/test",
      method: "POST",
      status: 500,
    });

    const result = await getErrorLogEntry(db, "err-1");
    expect(result.id).toBe("err-1");
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).toBe("Oops");
    expect(result.path).toBe("/api/test");
    expect(result.method).toBe("POST");
    expect(result.status).toBe(500);
  });
});

describe("cleanupErrorLog", () => {
  it("purges entries older than 7 days", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "old-1", { createdAt: daysAgo(10) });
    await seedErrorEntry(db, "old-2", { createdAt: daysAgo(8) });
    await seedErrorEntry(db, "recent-1", { createdAt: daysAgo(3) });
    await seedErrorEntry(db, "recent-2", { createdAt: daysAgo(1) });

    await cleanupErrorLog(db);

    const remaining = await db.select().from(schema.errorLog);
    expect(remaining).toHaveLength(2);
    const ids = remaining.map((r) => r.id);
    expect(ids).toContain("recent-1");
    expect(ids).toContain("recent-2");
  });

  it("keeps all entries when none are older than 7 days", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "recent-1", { createdAt: daysAgo(5) });
    await seedErrorEntry(db, "recent-2", { createdAt: daysAgo(2) });

    await cleanupErrorLog(db);

    const remaining = await db.select().from(schema.errorLog);
    expect(remaining).toHaveLength(2);
  });

  it("removes all entries when all are older than 7 days", async () => {
    const db = getTestDb();
    await seedErrorEntry(db, "old-1", { createdAt: daysAgo(14) });
    await seedErrorEntry(db, "old-2", { createdAt: daysAgo(10) });

    await cleanupErrorLog(db);

    const remaining = await db.select().from(schema.errorLog);
    expect(remaining).toHaveLength(0);
  });
});
