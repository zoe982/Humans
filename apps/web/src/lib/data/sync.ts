import { browser } from "$app/environment";
import { api, ApiRequestError } from "$lib/api";
import { isStale, clearCache } from "./cache";
import { getApiPath, ENTITY_TYPES, SUPABASE_ENTITIES } from "./registry";
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

function isWrappedRecord(value: unknown): value is { data: { id: string } } {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    isEntityRecord((value as { data: unknown }).data)
  );
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
    const raw = await api(path, { params: { limit: "500" } });
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
  const d1Entities = ENTITY_TYPES.filter((et) => !SUPABASE_ENTITIES.has(et));
  const supabaseEntities = ENTITY_TYPES.filter((et) =>
    SUPABASE_ENTITIES.has(et),
  );

  // D1 entities in parallel (no external connections)
  await Promise.all(d1Entities.map(async (et) => syncIfStale(et)));

  // Supabase entities sequentially (respect connection limit)
  for (const et of supabaseEntities) {
    await syncIfStale(et);
  }
}

export async function fetchSingleRecord(
  entityType: string,
  id: string,
): Promise<void> {
  const path = getApiPath(entityType);
  if (path === null) return;

  try {
    const raw = await api(`${path}/${id}`);
    const unwrapped = isWrappedRecord(raw) ? raw.data : raw;
    if (isEntityRecord(unwrapped)) {
      const store = getStore(entityType);
      store.patchItem(id, unwrapped);
    }
  } catch (error) {
    handleSessionExpiry(error);
    // Record might have been deleted or inaccessible
  }
}
