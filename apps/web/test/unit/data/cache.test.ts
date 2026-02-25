import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  initCache,
  getCached,
  setCached,
  clearCache,
  isStale,
} from "$lib/data/cache";
import { resetDbInstance } from "$lib/data/db";
import { clearKey } from "$lib/data/crypto";

describe("cache", () => {
  const sessionToken = "test-session-token-xyz";

  beforeEach(async () => {
    clearKey();
    resetDbInstance();
  });

  describe("initCache", () => {
    it("initializes without error", async () => {
      await expect(initCache(sessionToken)).resolves.not.toThrowError();
    });

    it("wipes data when session changes", async () => {
      await initCache("old-token");
      await setCached("humans", [{ id: "1", name: "Alice" }]);

      // Re-init with different token — should wipe
      resetDbInstance();
      await initCache("new-token");

      const result = await getCached<{ id: string; name: string }>("humans");
      expect(result).toBeNull();
    });

    it("preserves data when session token is the same", async () => {
      await initCache(sessionToken);
      await setCached("humans", [{ id: "1", name: "Alice" }]);

      // Re-init with same token
      clearKey();
      resetDbInstance();
      await initCache(sessionToken);

      const result = await getCached<{ id: string; name: string }>("humans");
      expect(result).not.toBeNull();
      expect(result!.items).toEqual([{ id: "1", name: "Alice" }]);
    });
  });

  describe("setCached / getCached round-trip", () => {
    it("stores and retrieves items for an entity type", async () => {
      await initCache(sessionToken);
      const items = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];

      await setCached("humans", items);
      const result = await getCached<{ id: string; name: string }>("humans");

      expect(result).not.toBeNull();
      expect(result!.items).toEqual(items);
      expect(result!.lastSync).toBeGreaterThan(0);
    });

    it("returns null for uncached entity type", async () => {
      await initCache(sessionToken);
      const result = await getCached("accounts");
      expect(result).toBeNull();
    });

    it("overwrites previous cache for same entity type", async () => {
      await initCache(sessionToken);

      await setCached("humans", [{ id: "1", name: "Alice" }]);
      await setCached("humans", [{ id: "2", name: "Bob" }]);

      const result = await getCached<{ id: string; name: string }>("humans");
      expect(result!.items).toEqual([{ id: "2", name: "Bob" }]);
    });

    it("stores different entity types independently", async () => {
      await initCache(sessionToken);

      await setCached("humans", [{ id: "h1", name: "Alice" }]);
      await setCached("accounts", [{ id: "a1", company: "Acme" }]);

      const humans = await getCached<{ id: string; name: string }>("humans");
      const accounts = await getCached<{ id: string; company: string }>("accounts");

      expect(humans!.items).toEqual([{ id: "h1", name: "Alice" }]);
      expect(accounts!.items).toEqual([{ id: "a1", company: "Acme" }]);
    });
  });

  describe("clearCache", () => {
    it("removes all cached data", async () => {
      await initCache(sessionToken);
      await setCached("humans", [{ id: "1" }]);
      await setCached("accounts", [{ id: "2" }]);

      await clearCache();

      // Need to re-init after clear
      resetDbInstance();
      await initCache(sessionToken);

      const humans = await getCached("humans");
      const accounts = await getCached("accounts");
      expect(humans).toBeNull();
      expect(accounts).toBeNull();
    });
  });

  describe("isStale", () => {
    it("returns true when lastSync is older than maxAge", () => {
      const fiveMinutesAgo = Date.now() - 6 * 60 * 1000;
      expect(isStale(fiveMinutesAgo, 300_000)).toBe(true);
    });

    it("returns false when lastSync is within maxAge", () => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      expect(isStale(oneMinuteAgo, 300_000)).toBe(false);
    });

    it("uses 5-minute default maxAge", () => {
      const fourMinutesAgo = Date.now() - 4 * 60 * 1000;
      expect(isStale(fourMinutesAgo)).toBe(false);

      const sixMinutesAgo = Date.now() - 6 * 60 * 1000;
      expect(isStale(sixMinutesAgo)).toBe(true);
    });

    it("returns true for null lastSync", () => {
      expect(isStale(null)).toBe(true);
    });
  });
});
