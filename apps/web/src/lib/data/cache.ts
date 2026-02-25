import {
  deriveKey,
  encrypt,
  decrypt,
  clearKey,
  generateSalt,
  getCachedKey,
  setCachedKey,
} from "./crypto";
import {
  getDb,
  clearAllData,
  resetDbInstance,
  ENTITY_CACHE_STORE,
  META_STORE,
  type EntityCacheEntry,
} from "./db";

const DEFAULT_MAX_AGE_MS = 300_000; // 5 minutes

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function initCache(sessionToken: string): Promise<void> {
  const fingerprint = await hashToken(sessionToken);
  const db = await getDb();

  const storedFingerprintRaw: unknown = await db.get(META_STORE, "sessionFingerprint");
  const storedFingerprint = typeof storedFingerprintRaw === "string" ? storedFingerprintRaw : null;

  if (storedFingerprint !== null && storedFingerprint !== fingerprint) {
    // Session changed — wipe all data and re-derive key
    await clearAllData();
  }

  await db.put(META_STORE, fingerprint, "sessionFingerprint");

  // Derive and cache the encryption key
  // Use a stable salt per session (stored in meta)
  const saltRaw: unknown = await db.get(META_STORE, "encryptionSalt");
  let salt: Uint8Array | undefined = saltRaw instanceof Uint8Array ? saltRaw : undefined;
  if (salt === undefined) {
    salt = generateSalt();
    await db.put(META_STORE, salt, "encryptionSalt");
  }

  const key = await deriveKey(sessionToken, salt);
  setCachedKey(key);
}

function isEntityCacheEntry(value: unknown): value is EntityCacheEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "entityType" in value &&
    "iv" in value &&
    "ciphertext" in value &&
    "lastSync" in value
  );
}

export async function getCached(
  entityType: string,
): Promise<{ items: unknown[]; lastSync: number } | null> {
  const key = getCachedKey();
  if (key === null) return null;

  const db = await getDb();
  const entryRaw: unknown = await db.get(ENTITY_CACHE_STORE, entityType);
  if (!isEntityCacheEntry(entryRaw)) return null;

  const decrypted = await decrypt(key, entryRaw.iv, entryRaw.ciphertext);
  if (!Array.isArray(decrypted)) return null;
  return { items: decrypted, lastSync: entryRaw.lastSync };
}

export async function setCached(
  entityType: string,
  items: unknown[],
): Promise<void> {
  const key = getCachedKey();
  if (key === null) return;

  const { iv, ciphertext } = await encrypt(key, items);
  const db = await getDb();

  // Get or generate a salt for this entity type
  const entry: EntityCacheEntry = {
    entityType,
    iv,
    ciphertext,
    salt: new Uint8Array(0), // Salt is stored in meta, not per-entry
    lastSync: Date.now(),
    recordCount: items.length,
  };

  await db.put(ENTITY_CACHE_STORE, entry, entityType);
}

export async function clearCache(): Promise<void> {
  await clearAllData();
  clearKey();
  resetDbInstance();
}

export function isStale(
  lastSync: number | null,
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): boolean {
  if (lastSync === null) return true;
  return Date.now() - lastSync > maxAgeMs;
}
