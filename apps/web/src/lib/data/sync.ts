import { browser } from "$app/environment";
import { api, ApiRequestError } from "$lib/api";
import { isStale, clearCache } from "./cache";
import { getApiPath, ENTITY_TYPES } from "./registry";
import { getStore } from "./stores.svelte";

function isEntityListResponse(value: unknown): value is { data: { id: string }[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    Array.isArray((value as { data: unknown }).data)
  );
}

function isEntityRecord(value: unknown): value is { id: string } {
  return typeof value === "object" && value !== null && "id" in value && typeof (value as { id: unknown }).id === "string";
}

function handleSessionExpiry(error: unknown): void {
  if (error instanceof ApiRequestError && error.status === 401) {
    void clearCache();
    if (browser) window.location.href = "/login";
  }
}

export async function syncEntity(entityType: string): Promise<void> {
  const path = getApiPath(entityType);
  if (path === null) return;

  const store = getStore(entityType);
  store.setLoading(true);

  try {
    const raw = await api(path, { params: { limit: "10000" } });
    if (isEntityListResponse(raw)) {
      store.setItems(raw.data);
    }
  } catch (error) {
    handleSessionExpiry(error);
    // Sync failed — keep existing data, just clear loading
  } finally {
    store.setLoading(false);
  }
}

export async function syncIfStale(
  entityType: string,
  maxAgeMs?: number,
): Promise<void> {
  const store = getStore(entityType);
  if (isStale(store.lastSync, maxAgeMs)) {
    await syncEntity(entityType);
  }
}

export async function syncAll(): Promise<void> {
  await Promise.all(ENTITY_TYPES.map(async (et) => syncEntity(et)));
}

export async function fetchSingleRecord(
  entityType: string,
  id: string,
): Promise<void> {
  const path = getApiPath(entityType);
  if (path === null) return;

  try {
    const raw = await api(`${path}/${id}`);
    if (isEntityRecord(raw)) {
      const store = getStore(entityType);
      store.updateItem(id, raw);
    }
  } catch (error) {
    handleSessionExpiry(error);
    // Record might have been deleted or inaccessible
  }
}
