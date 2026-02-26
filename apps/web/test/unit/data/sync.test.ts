import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be hoisted so the mock factory can reference it
const { browserRef } = vi.hoisted(() => ({ browserRef: { value: false } }));

vi.mock("$app/environment", () => ({
  get browser() { return browserRef.value; },
  building: false,
  dev: true,
  version: "test",
}));

// Mock dependencies
vi.mock("$lib/api", () => ({
  api: vi.fn(),
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    constructor(message: string, _code: string | undefined, _requestId: string | undefined, _details: unknown, status: number) {
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

vi.mock("$lib/data/stores.svelte", () => {
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

import { syncEntity, syncIfStale, syncAll, fetchSingleRecord } from "$lib/data/sync";
import { api, ApiRequestError } from "$lib/api";
import { isStale, clearCache } from "$lib/data/cache";
import { getStore } from "$lib/data/stores.svelte";

const mockApi = vi.mocked(api);
const mockIsStale = vi.mocked(isStale);
const mockClearCache = vi.mocked(clearCache);

describe("sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserRef.value = false;
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

    it("sets loading true before fetch and false after success", async () => {
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

    it("does not call setItems when API response is not an entity list response", async () => {
      // Response has no top-level `data` array — should be silently ignored
      mockApi.mockResolvedValueOnce({ id: "unexpected", name: "not a list" });

      const store = getStore("pets");
      await syncEntity("pets");

      expect(store.setItems).not.toHaveBeenCalled();
      // Loading is still cleared
      expect(store.setLoading).toHaveBeenCalledWith(false);
    });

    it("does not call setItems when API returns a non-array data value", async () => {
      // `data` exists but is not an array
      mockApi.mockResolvedValueOnce({ data: "not-an-array" });

      const store = getStore("flights");
      await syncEntity("flights");

      expect(store.setItems).not.toHaveBeenCalled();
    });

    it("calls clearCache on 401 ApiRequestError", async () => {
      const err = new ApiRequestError("Unauthorized", undefined, undefined, undefined, 401);
      mockApi.mockRejectedValueOnce(err);

      await syncEntity("humans");

      expect(mockClearCache).toHaveBeenCalledOnce();
    });

    it("redirects to /login on 401 ApiRequestError when browser=true", async () => {
      browserRef.value = true;

      let capturedHref = "";
      const locationProto = Object.getPrototypeOf(window.location) as object;
      const origDescriptor = Object.getOwnPropertyDescriptor(locationProto, "href");
      Object.defineProperty(window.location, "href", {
        get() { return capturedHref; },
        set(v: string) { capturedHref = v; },
        configurable: true,
      });

      const err = new ApiRequestError("Unauthorized", undefined, undefined, undefined, 401);
      mockApi.mockRejectedValueOnce(err);

      await syncEntity("accounts");

      expect(capturedHref).toBe("/login");

      if (origDescriptor != null) {
        Object.defineProperty(window.location, "href", origDescriptor);
      }
    });

    it("does not redirect on non-401 error when browser=true", async () => {
      browserRef.value = true;

      let capturedHref = "";
      const locationProto = Object.getPrototypeOf(window.location) as object;
      const origDescriptor = Object.getOwnPropertyDescriptor(locationProto, "href");
      Object.defineProperty(window.location, "href", {
        get() { return capturedHref; },
        set(v: string) { capturedHref = v; },
        configurable: true,
      });

      const err = new ApiRequestError("Server Error", undefined, undefined, undefined, 500);
      mockApi.mockRejectedValueOnce(err);

      await syncEntity("accounts");

      expect(capturedHref).toBe("");
      expect(mockClearCache).not.toHaveBeenCalled();

      if (origDescriptor != null) {
        Object.defineProperty(window.location, "href", origDescriptor);
      }
    });

    it("does not call clearCache for non-ApiRequestError errors", async () => {
      mockApi.mockRejectedValueOnce(new Error("Plain network failure"));

      await syncEntity("humans");

      expect(mockClearCache).not.toHaveBeenCalled();
    });
  });

  describe("syncIfStale", () => {
    it("syncs when data is stale", async () => {
      mockIsStale.mockReturnValue(true);
      mockApi.mockResolvedValueOnce({ data: [], total: 0 });

      const store = getStore("humans");
      (store as { lastSync: number | null }).lastSync = Date.now() - 600_000;

      await syncIfStale("humans");

      expect(mockApi).toHaveBeenCalled();
    });

    it("skips sync when data is fresh", async () => {
      mockIsStale.mockReturnValue(false);

      const store = getStore("activities");
      (store as { lastSync: number | null }).lastSync = Date.now();

      await syncIfStale("activities");

      expect(mockApi).not.toHaveBeenCalled();
    });

    it("passes maxAgeMs to isStale", async () => {
      mockIsStale.mockReturnValue(false);

      const store = getStore("opportunities");
      (store as { lastSync: number | null }).lastSync = Date.now();

      await syncIfStale("opportunities", 60_000);

      expect(mockIsStale).toHaveBeenCalledWith(store.lastSync, 60_000);
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

  describe("fetchSingleRecord", () => {
    it("returns early when getApiPath returns null for unknown entity type", async () => {
      await fetchSingleRecord("nonexistent", "some-id");
      expect(mockApi).not.toHaveBeenCalled();
    });

    it("calls api with the correct path including the id", async () => {
      mockApi.mockResolvedValueOnce({ id: "h-1", name: "Alice" });

      await fetchSingleRecord("humans", "h-1");

      expect(mockApi).toHaveBeenCalledWith("/api/humans/h-1");
    });

    it("updates the store item when API returns a valid entity record", async () => {
      const record = { id: "p-1", name: "Fluffy" };
      mockApi.mockResolvedValueOnce(record);

      const store = getStore("pets");
      await fetchSingleRecord("pets", "p-1");

      expect(store.updateItem).toHaveBeenCalledWith("p-1", record);
    });

    it("does not call updateItem when API response is not an entity record", async () => {
      // Response has no `id` string field
      mockApi.mockResolvedValueOnce({ data: [] });

      const store = getStore("flights");
      await fetchSingleRecord("flights", "f-1");

      expect(store.updateItem).not.toHaveBeenCalled();
    });

    it("does not call updateItem when id field is not a string", async () => {
      mockApi.mockResolvedValueOnce({ id: 42 });

      const store = getStore("humans");
      await fetchSingleRecord("humans", "h-1");

      expect(store.updateItem).not.toHaveBeenCalled();
    });

    it("calls clearCache on 401 ApiRequestError", async () => {
      const err = new ApiRequestError("Unauthorized", undefined, undefined, undefined, 401);
      mockApi.mockRejectedValueOnce(err);

      await fetchSingleRecord("humans", "h-1");

      expect(mockClearCache).toHaveBeenCalledOnce();
    });

    it("redirects to /login on 401 ApiRequestError when browser=true", async () => {
      browserRef.value = true;

      let capturedHref = "";
      const locationProto = Object.getPrototypeOf(window.location) as object;
      const origDescriptor = Object.getOwnPropertyDescriptor(locationProto, "href");
      Object.defineProperty(window.location, "href", {
        get() { return capturedHref; },
        set(v: string) { capturedHref = v; },
        configurable: true,
      });

      const err = new ApiRequestError("Unauthorized", undefined, undefined, undefined, 401);
      mockApi.mockRejectedValueOnce(err);

      await fetchSingleRecord("humans", "h-expired");

      expect(capturedHref).toBe("/login");

      if (origDescriptor != null) {
        Object.defineProperty(window.location, "href", origDescriptor);
      }
    });

    it("does not call clearCache for non-401 errors", async () => {
      const err = new ApiRequestError("Not Found", undefined, undefined, undefined, 404);
      mockApi.mockRejectedValueOnce(err);

      await fetchSingleRecord("humans", "h-missing");

      expect(mockClearCache).not.toHaveBeenCalled();
    });

    it("silently swallows plain non-ApiRequestError errors", async () => {
      mockApi.mockRejectedValueOnce(new Error("connection reset"));

      // Should not throw
      await expect(fetchSingleRecord("humans", "h-1")).resolves.toBeUndefined();
      expect(mockClearCache).not.toHaveBeenCalled();
    });
  });
});
