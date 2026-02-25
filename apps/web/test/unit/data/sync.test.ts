import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("$lib/api", () => ({
  api: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    constructor(message: string, code: string | undefined, requestId: string | undefined, details: unknown, status: number) {
      super(message);
      this.name = "ApiRequestError";
      this.status = status;
    }
  },
}));

vi.mock("$lib/data/cache", () => ({
  setCached: vi.fn().mockResolvedValue(undefined),
  getCached: vi.fn().mockResolvedValue(null),
  isStale: vi.fn().mockReturnValue(true),
  clearCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("$lib/data/stores.svelte.ts", () => {
  const stores: Record<string, ReturnType<typeof makeStore>> = {};

  function makeStore() {
    return {
      items: [] as Array<{ id: string }>,
      loading: false,
      lastSync: null as number | null,
      setItems: vi.fn(function (this: { items: Array<{ id: string }>; lastSync: number | null }, data: Array<{ id: string }>) {
        this.items = data;
        this.lastSync = Date.now();
      }),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      addItem: vi.fn(),
      clear: vi.fn(),
      setLoading: vi.fn(function (this: { loading: boolean }, value: boolean) {
        this.loading = value;
      }),
    };
  }

  return {
    createEntityStore: vi.fn((entityType: string) => {
      if (!stores[entityType]) stores[entityType] = makeStore();
      return stores[entityType];
    }),
    getStore: vi.fn((entityType: string) => {
      if (!stores[entityType]) stores[entityType] = makeStore();
      return stores[entityType];
    }),
    __stores: stores,
  };
});

import { syncEntity, syncIfStale, syncAll } from "$lib/data/sync";
import { api } from "$lib/api";
import { isStale } from "$lib/data/cache";
import { getStore } from "$lib/data/stores.svelte.ts";

const mockApi = vi.mocked(api);
const mockIsStale = vi.mocked(isStale);

describe("sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncEntity", () => {
    it("fetches from API and updates the store", async () => {
      const items = [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ];
      mockApi.mockResolvedValueOnce({ data: items, total: 2 });

      await syncEntity("humans");

      expect(mockApi).toHaveBeenCalledWith("/api/humans", {
        params: { limit: "10000" },
      });

      const store = getStore("humans");
      expect(store.setItems).toHaveBeenCalledWith(items);
    });

    it("sets loading state during sync", async () => {
      mockApi.mockResolvedValueOnce({ data: [], total: 0 });

      const store = getStore("accounts");
      await syncEntity("accounts");

      expect(store.setLoading).toHaveBeenCalledWith(true);
      expect(store.setLoading).toHaveBeenCalledWith(false);
    });

    it("resets loading on error", async () => {
      mockApi.mockRejectedValueOnce(new Error("Network error"));

      const store = getStore("humans");
      await syncEntity("humans");

      expect(store.setLoading).toHaveBeenCalledWith(false);
    });

    it("does nothing for unknown entity type", async () => {
      await syncEntity("nonexistent");
      expect(mockApi).not.toHaveBeenCalled();
    });
  });

  describe("syncIfStale", () => {
    it("syncs when data is stale", async () => {
      mockIsStale.mockReturnValue(true);
      mockApi.mockResolvedValueOnce({ data: [], total: 0 });

      const store = getStore("humans");
      store.lastSync = Date.now() - 600_000;

      await syncIfStale("humans");

      expect(mockApi).toHaveBeenCalled();
    });

    it("skips sync when data is fresh", async () => {
      mockIsStale.mockReturnValue(false);

      const store = getStore("activities");
      store.lastSync = Date.now();

      await syncIfStale("activities");

      expect(mockApi).not.toHaveBeenCalled();
    });
  });

  describe("syncAll", () => {
    it("syncs all registered entity types", async () => {
      mockApi.mockResolvedValue({ data: [], total: 0 });

      await syncAll();

      // Should have called api for each registered entity type
      expect(mockApi.mock.calls.length).toBeGreaterThanOrEqual(7);
    });
  });
});
