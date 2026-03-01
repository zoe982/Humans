/**
 * In-memory config table cache with 5-minute TTL.
 *
 * Config tables (5-20 rows, rarely changed) are re-fetched from the DB on every
 * request — 34 unbounded scans across 10 services. This module caches them
 * per-isolate so repeated reads within the same Worker isolate are free.
 *
 * Workers reuse isolates for several minutes, so the hit rate is high even
 * without KV backing. KV can be added as an L2 later if cross-isolate sharing
 * becomes valuable.
 */
import type { PgTable } from "drizzle-orm/pg-core";
import type { DB } from "../services/types";

interface CacheEntry {
  data: unknown[];
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Return all rows from a config table, serving from an in-memory cache when
 * the entry is fresh. Falls back to a full table scan and caches the result.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Drizzle generic table type requires broad constraint
export async function getCachedConfig<T extends PgTable<any>>(
  db: DB,
  table: T,
  tableName: string,
): Promise<T["$inferSelect"][]> {
  const entry = cache.get(tableName);
  if (entry != null && Date.now() < entry.expiry) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- generic PgTable cache entry, entry.data shape is T["$inferSelect"][] by construction
    return entry.data as T["$inferSelect"][];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion -- Drizzle from() requires a concrete PgTable; generic T extends PgTable<any> is intentionally broad
  const rows: T["$inferSelect"][] = await db.select().from(table as any);
  cache.set(tableName, { data: rows, expiry: Date.now() + TTL_MS });
  return rows;
}

/** Remove a specific config table from the cache (call after mutations). */
export function invalidateConfig(tableName: string): void {
  cache.delete(tableName);
}

/** Remove all config entries (useful for testing). */
export function invalidateAllConfig(): void {
  cache.clear();
}
