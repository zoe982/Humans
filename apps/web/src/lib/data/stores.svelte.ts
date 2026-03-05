import { setCached } from "$lib/data/cache";

export type EntityStore<T extends { id: string }> = ReturnType<
  typeof createEntityStore<T>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storeMap = new Map<string, EntityStore<any>>();

export function getStore<T extends { id: string } = { id: string }>(
  entityType: string,
): EntityStore<T> {
  let store = storeMap.get(entityType);
  if (!store) {
    store = createEntityStore<T>(entityType);
    storeMap.set(entityType, store);
  }
  return store as EntityStore<T>;
}

export function clearAllStores(): void {
  for (const store of storeMap.values()) {
    store.clear();
  }
}

export function createEntityStore<T extends { id: string }>(
  entityType: string,
) {
  let items = $state<T[]>([]);
  let loading = $state(false);
  let lastSync = $state<number | null>(null);

  function persist(data: T[]): void {
    void setCached(entityType, data);
  }

  return {
    get items() {
      return items;
    },
    get loading() {
      return loading;
    },
    get lastSync() {
      return lastSync;
    },
    setItems(data: T[]) {
      items = data;
      lastSync = Date.now();
      persist(data);
    },
    updateItem(id: string, data: T) {
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return;
      items[idx] = data;
      persist(items);
    },
    patchItem(id: string, patch: Record<string, unknown>) {
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return;
      items[idx] = { ...items[idx], ...patch } as T;
      persist(items);
    },
    removeItem(id: string) {
      items = items.filter((item) => item.id !== id);
      persist(items);
    },
    addItem(item: T) {
      items = [item, ...items];
      persist(items);
    },
    clear() {
      items = [];
      lastSync = null;
    },
    setLoading(value: boolean) {
      loading = value;
    },
  };
}
