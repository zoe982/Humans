import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the cache module — stores persist to cache as a side effect
vi.mock("$lib/data/cache", () => ({
  setCached: vi.fn().mockResolvedValue(undefined),
  getCached: vi.fn().mockResolvedValue(null),
}));

import { createEntityStore } from "$lib/data/stores.svelte.ts";

describe("createEntityStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty items and loading=false", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.lastSync).toBeNull();
  });

  it("setItems replaces all items and updates lastSync", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    const items = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ];

    store.setItems(items);

    expect(store.items).toEqual(items);
    expect(store.lastSync).toBeGreaterThan(0);
  });

  it("addItem prepends a new item", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    store.setItems([{ id: "1", name: "Alice" }]);

    store.addItem({ id: "2", name: "Bob" });

    expect(store.items).toHaveLength(2);
    expect(store.items[0].id).toBe("2");
    expect(store.items[1].id).toBe("1");
  });

  it("updateItem replaces the item with matching id", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    store.setItems([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);

    store.updateItem("1", { id: "1", name: "Alice Updated" });

    expect(store.items[0].name).toBe("Alice Updated");
    expect(store.items[1].name).toBe("Bob");
  });

  it("updateItem does nothing for non-existent id", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    store.setItems([{ id: "1", name: "Alice" }]);

    store.updateItem("999", { id: "999", name: "Ghost" });

    expect(store.items).toHaveLength(1);
    expect(store.items[0].name).toBe("Alice");
  });

  it("removeItem filters out the item with matching id", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    store.setItems([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
    ]);

    store.removeItem("2");

    expect(store.items).toHaveLength(2);
    expect(store.items.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("removeItem does nothing for non-existent id", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    store.setItems([{ id: "1", name: "Alice" }]);

    store.removeItem("999");

    expect(store.items).toHaveLength(1);
  });

  it("clear resets items and lastSync", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    store.setItems([{ id: "1", name: "Alice" }]);

    store.clear();

    expect(store.items).toEqual([]);
    expect(store.lastSync).toBeNull();
  });

  it("setItems calls setCached with entity type and items", async () => {
    const { setCached } = await import("$lib/data/cache");
    const store = createEntityStore<{ id: string; name: string }>("humans");

    const items = [{ id: "1", name: "Alice" }];
    store.setItems(items);

    // Allow microtask queue to process the void promise
    await new Promise((r) => setTimeout(r, 0));

    expect(setCached).toHaveBeenCalledWith("humans", items);
  });

  it("setLoading updates loading state", () => {
    const store = createEntityStore<{ id: string; name: string }>("test");
    expect(store.loading).toBe(false);

    store.setLoading(true);
    expect(store.loading).toBe(true);

    store.setLoading(false);
    expect(store.loading).toBe(false);
  });
});
