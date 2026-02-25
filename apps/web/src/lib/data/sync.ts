import { api, ApiRequestError } from "$lib/api";
import { isStale, clearCache } from "./cache";
import { getApiPath, ENTITY_TYPES } from "./registry";
import { getStore } from "./stores.svelte";

function handleSessionExpiry(error: unknown): void {
  if (error instanceof ApiRequestError && error.status === 401) {
    void clearCache();
    if (typeof window !== "undefined") window.location.href = "/login";
  }
}

export async function syncEntity(entityType: string): Promise<void> {
  const path = getApiPath(entityType);
  if (!path) return;

  const store = getStore(entityType);
  store.setLoading(true);

  try {
    const result = (await api(path, {
      params: { limit: "10000" },
    })) as { data: Array<{ id: string }>; total: number };

    store.setItems(result.data);
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
  await Promise.all(ENTITY_TYPES.map((et) => syncEntity(et)));
}

export async function fetchSingleRecord(
  entityType: string,
  id: string,
): Promise<void> {
  const path = getApiPath(entityType);
  if (!path) return;

  try {
    const record = (await api(`${path}/${id}`)) as { id: string };
    const store = getStore(entityType);
    store.updateItem(id, record);
  } catch (error) {
    handleSessionExpiry(error);
    // Record might have been deleted or inaccessible
  }
}
