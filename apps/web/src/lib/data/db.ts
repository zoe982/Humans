import { openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "humans-crm-cache";
export const DB_VERSION = 1;
export const ENTITY_CACHE_STORE = "entity_cache";
export const META_STORE = "meta";

export interface EntityCacheEntry {
  entityType: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
  salt: Uint8Array;
  lastSync: number;
  recordCount: number;
}

let dbInstance: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
  if (dbInstance !== null) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ENTITY_CACHE_STORE)) {
        db.createObjectStore(ENTITY_CACHE_STORE);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    },
  });

  return dbInstance;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([ENTITY_CACHE_STORE, META_STORE], "readwrite");
  await Promise.all([
    tx.objectStore(ENTITY_CACHE_STORE).clear(),
    tx.objectStore(META_STORE).clear(),
    tx.done,
  ]);
}

export function resetDbInstance(): void {
  dbInstance = null;
}
