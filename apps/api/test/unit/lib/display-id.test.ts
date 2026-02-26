import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @humans/db so we control the displayIdCounters table reference while
// keeping the real formatDisplayId pure function for accurate output assertions.
vi.mock("@humans/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@humans/db")>();
  return {
    ...real,
    // Replace the table object with a recognisable sentinel — the source only
    // uses it as an argument to db.insert() and as the eq() target, so the
    // value itself never matters for unit tests.
    displayIdCounters: { prefix: "prefix", counter: "counter" },
  };
});

import { nextDisplayId, nextDisplayIdBatch } from "../../../src/lib/display-id";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a fluent mock for the insert chain:
 *   db.insert(table).values(...).onConflictDoUpdate(...)
 *
 * Captures the arguments passed at each stage so tests can inspect them.
 */
function makeInsertChain() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });
  return { insert, values, onConflictDoUpdate };
}

/**
 * Builds a minimal mock DB object.
 *
 * @param existingCounter - the value of `row.counter` returned by findFirst,
 *   or `undefined` to simulate no existing row.
 */
function makeDb(existingCounter: number | undefined) {
  const chain = makeInsertChain();
  const findFirst = vi.fn().mockResolvedValue(
    existingCounter !== undefined ? { counter: existingCounter } : undefined,
  );
  const db = {
    query: { displayIdCounters: { findFirst } },
    insert: chain.insert,
  };
  return { db, findFirst, ...chain };
}

// ---------------------------------------------------------------------------
// nextDisplayId
// ---------------------------------------------------------------------------

describe("nextDisplayId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates the first ID when no counter row exists", async () => {
    // No existing row → counter defaults to 0, so new counter is 1.
    const { db, findFirst, insert, values, onConflictDoUpdate } = makeDb(undefined);

    const result = await nextDisplayId(db as any, "HUM");

    // Correct formatted ID for counter=1
    expect(result).toBe("HUM-AAA-001");

    // DB was queried once
    expect(findFirst).toHaveBeenCalledTimes(1);

    // Insert+upsert was called with counter=1
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({ prefix: "HUM", counter: 1 });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { counter: 1 } }),
    );
  });

  it("increments an existing counter", async () => {
    // Existing counter is 41 → new counter should be 42.
    const { db, findFirst, values, onConflictDoUpdate } = makeDb(41);

    const result = await nextDisplayId(db as any, "ACC");

    expect(result).toBe("ACC-AAA-042");
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({ prefix: "ACC", counter: 42 });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { counter: 42 } }),
    );
  });

  it("produces the correct ID at a block boundary (counter=999 → next is AAB-001)", async () => {
    const { db, values } = makeDb(999);

    const result = await nextDisplayId(db as any, "PET");

    // Counter 1000 maps to AAB-001
    expect(result).toBe("PET-AAB-001");
    expect(values).toHaveBeenCalledWith({ prefix: "PET", counter: 1000 });
  });
});

// ---------------------------------------------------------------------------
// nextDisplayIdBatch
// ---------------------------------------------------------------------------

describe("nextDisplayIdBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when count is 0", async () => {
    const { db, findFirst, insert } = makeDb(undefined);

    const result = await nextDisplayIdBatch(db as any, "HUM", 0);

    expect(result).toEqual([]);
    // No DB calls should be made
    expect(findFirst).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns an empty array when count is negative", async () => {
    const { db, findFirst, insert } = makeDb(undefined);

    const result = await nextDisplayIdBatch(db as any, "HUM", -5);

    expect(result).toEqual([]);
    expect(findFirst).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("generates 3 sequential IDs starting from 1 when no counter row exists", async () => {
    // No existing row → startCounter=1, endCounter=3
    const { db, findFirst, insert, values, onConflictDoUpdate } = makeDb(undefined);

    const result = await nextDisplayIdBatch(db as any, "HUM", 3);

    expect(result).toEqual(["HUM-AAA-001", "HUM-AAA-002", "HUM-AAA-003"]);

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    // endCounter written in a single upsert
    expect(values).toHaveBeenCalledWith({ prefix: "HUM", counter: 3 });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { counter: 3 } }),
    );
  });

  it("continues from an existing counter (counter=5, batch=3 → IDs 6,7,8)", async () => {
    const { db, findFirst, values, onConflictDoUpdate } = makeDb(5);

    const result = await nextDisplayIdBatch(db as any, "EML", 3);

    expect(result).toEqual(["EML-AAA-006", "EML-AAA-007", "EML-AAA-008"]);

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({ prefix: "EML", counter: 8 });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { counter: 8 } }),
    );
  });

  it("handles a batch of 1 correctly", async () => {
    const { db, values } = makeDb(10);

    const result = await nextDisplayIdBatch(db as any, "FON", 1);

    expect(result).toHaveLength(1);
    expect(result).toEqual(["FON-AAA-011"]);
    expect(values).toHaveBeenCalledWith({ prefix: "FON", counter: 11 });
  });

  it("makes exactly one DB read and one DB write regardless of batch size", async () => {
    const { db, findFirst, insert } = makeDb(0);

    await nextDisplayIdBatch(db as any, "ACT", 50);

    // O(1) DB operations
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("returns IDs spanning a block boundary correctly", async () => {
    // counter=998 → next three are 999 (AAA-999), 1000 (AAB-001), 1001 (AAB-002)
    const { db, values } = makeDb(998);

    const result = await nextDisplayIdBatch(db as any, "GEO", 3);

    expect(result).toEqual(["GEO-AAA-999", "GEO-AAB-001", "GEO-AAB-002"]);
    expect(values).toHaveBeenCalledWith({ prefix: "GEO", counter: 1001 });
  });
});
