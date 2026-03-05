import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$lib/data/stores.svelte", () => {
  const stores: Record<string, { removeItem: ReturnType<typeof vi.fn>; updateItem: ReturnType<typeof vi.fn> }> = {};
  return {
    getStore: vi.fn((entityType: string) => {
      if (!stores[entityType]) {
        stores[entityType] = {
          removeItem: vi.fn(),
          updateItem: vi.fn(),
        };
      }
      return stores[entityType];
    }),
    __stores: stores,
  };
});

vi.mock("$lib/data/sync", () => ({
  syncEntity: vi.fn().mockResolvedValue(undefined),
  fetchSingleRecord: vi.fn().mockResolvedValue(undefined),
}));

import {
  handleRealtimeMessage,
} from "$lib/data/realtime-handler";
import { getStore } from "$lib/data/stores.svelte";
import { syncEntity, fetchSingleRecord } from "$lib/data/sync";

const mockSyncEntity = vi.mocked(syncEntity);
const mockFetchSingle = vi.mocked(fetchSingleRecord);

describe("handleRealtimeMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes item from store on DELETE with ID", () => {
    const result = handleRealtimeMessage({
      method: "DELETE",
      path: "/api/humans/abc123",
      actorId: "other-user",
    }, "current-user");

    expect(result).toBe("handled");
    const store = getStore("humans");
    expect(store.removeItem).toHaveBeenCalledWith("abc123");
  });

  it("fetches single record on PATCH with ID", () => {
    handleRealtimeMessage({
      method: "PATCH",
      path: "/api/accounts/xyz",
      actorId: "other-user",
    }, "current-user");

    expect(mockFetchSingle).toHaveBeenCalledWith("accounts", "xyz");
  });

  it("fetches single record on PUT with ID", () => {
    handleRealtimeMessage({
      method: "PUT",
      path: "/api/activities/act1",
      actorId: "other-user",
    }, "current-user");

    expect(mockFetchSingle).toHaveBeenCalledWith("activities", "act1");
  });

  it("syncs entire entity type on POST (no ID)", () => {
    handleRealtimeMessage({
      method: "POST",
      path: "/api/humans",
      actorId: "other-user",
    }, "current-user");

    expect(mockSyncEntity).toHaveBeenCalledWith("humans");
  });

  it("processes messages from the current user (server confirmation)", () => {
    const result = handleRealtimeMessage({
      method: "POST",
      path: "/api/humans",
      actorId: "current-user",
    }, "current-user");

    expect(result).toBe("handled");
    expect(mockSyncEntity).toHaveBeenCalledWith("humans");
  });

  it("returns 'unknown' for unrecognized paths", () => {
    const result = handleRealtimeMessage({
      method: "POST",
      path: "/api/unknown-thing",
      actorId: "other-user",
    }, "current-user");

    expect(result).toBe("unknown");
  });

  it("returns 'unknown' for non-API paths", () => {
    const result = handleRealtimeMessage({
      method: "POST",
      path: "/dashboard",
      actorId: "other-user",
    }, "current-user");

    expect(result).toBe("unknown");
  });

  it("syncs entity type when method is unknown but has no ID", () => {
    handleRealtimeMessage({
      method: "GET",
      path: "/api/pets",
      actorId: "other-user",
    }, "current-user");

    expect(mockSyncEntity).toHaveBeenCalledWith("pets");
  });
});
