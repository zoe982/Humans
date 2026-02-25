import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  getDb,
  clearAllData,
  DB_NAME,
  ENTITY_CACHE_STORE,
  META_STORE,
} from "$lib/data/db";

describe("db", () => {
  beforeEach(async () => {
    // Clean slate for each test
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });

  describe("getDb", () => {
    it("opens a database with the expected name", async () => {
      const db = await getDb();
      expect(db.name).toBe(DB_NAME);
    });

    it("creates entity_cache object store", async () => {
      const db = await getDb();
      expect(db.objectStoreNames).toContain(ENTITY_CACHE_STORE);
    });

    it("creates meta object store", async () => {
      const db = await getDb();
      expect(db.objectStoreNames).toContain(META_STORE);
    });

    it("returns the same database on repeated calls", async () => {
      const db1 = await getDb();
      const db2 = await getDb();
      expect(db1).toBe(db2);
    });
  });

  describe("entity_cache store", () => {
    it("stores and retrieves entity cache entries", async () => {
      const db = await getDb();
      const entry = {
        entityType: "humans",
        iv: new Uint8Array([1, 2, 3]),
        ciphertext: new ArrayBuffer(8),
        salt: new Uint8Array([4, 5, 6]),
        lastSync: Date.now(),
        recordCount: 42,
      };

      await db.put(ENTITY_CACHE_STORE, entry, "humans");
      const result = await db.get(ENTITY_CACHE_STORE, "humans");

      expect(result).toBeDefined();
      expect(result!.entityType).toBe("humans");
      expect(result!.recordCount).toBe(42);
    });

    it("overwrites existing entries for same key", async () => {
      const db = await getDb();

      await db.put(ENTITY_CACHE_STORE, { entityType: "humans", recordCount: 10 }, "humans");
      await db.put(ENTITY_CACHE_STORE, { entityType: "humans", recordCount: 20 }, "humans");

      const result = await db.get(ENTITY_CACHE_STORE, "humans");
      expect(result!.recordCount).toBe(20);
    });
  });

  describe("meta store", () => {
    it("stores and retrieves session fingerprint", async () => {
      const db = await getDb();
      await db.put(META_STORE, "abc123-hash", "sessionFingerprint");
      const result = await db.get(META_STORE, "sessionFingerprint");
      expect(result).toBe("abc123-hash");
    });
  });

  describe("clearAllData", () => {
    it("removes all data from both stores", async () => {
      const db = await getDb();
      await db.put(ENTITY_CACHE_STORE, { entityType: "humans" }, "humans");
      await db.put(ENTITY_CACHE_STORE, { entityType: "accounts" }, "accounts");
      await db.put(META_STORE, "fingerprint", "sessionFingerprint");

      await clearAllData();

      const freshDb = await getDb();
      const entities = await freshDb.getAll(ENTITY_CACHE_STORE);
      const meta = await freshDb.getAll(META_STORE);

      expect(entities).toHaveLength(0);
      expect(meta).toHaveLength(0);
    });
  });
});
