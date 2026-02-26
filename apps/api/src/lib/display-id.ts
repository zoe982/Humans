import { eq } from "drizzle-orm";
import { displayIdCounters, formatDisplayId, type DisplayIdPrefix } from "@humans/db";
import type { DB } from "../services/types";

/**
 * Atomically increment the display ID counter for a prefix and return the formatted ID.
 * D1 is single-writer so simple read+update is safe.
 */
export async function nextDisplayId(db: DB, prefix: DisplayIdPrefix): Promise<string> {
  const row = await db.query.displayIdCounters.findFirst({
    where: eq(displayIdCounters.prefix, prefix),
  });

  const newCounter = (row?.counter ?? 0) + 1;

  await db
    .insert(displayIdCounters)
    .values({ prefix, counter: newCounter })
    .onConflictDoUpdate({
      target: displayIdCounters.prefix,
      set: { counter: newCounter },
    });

  return formatDisplayId(prefix, newCounter);
}

/**
 * Atomically increment the display ID counter by `count` and return all generated IDs.
 * Single D1 read+write — O(1) DB operations regardless of batch size.
 */
export async function nextDisplayIdBatch(
  db: DB,
  prefix: DisplayIdPrefix,
  count: number,
): Promise<string[]> {
  if (count <= 0) return [];

  const row = await db.query.displayIdCounters.findFirst({
    where: eq(displayIdCounters.prefix, prefix),
  });

  const startCounter = (row?.counter ?? 0) + 1;
  const endCounter = startCounter + count - 1;

  await db
    .insert(displayIdCounters)
    .values({ prefix, counter: endCounter })
    .onConflictDoUpdate({
      target: displayIdCounters.prefix,
      set: { counter: endCounter },
    });

  const ids: string[] = [];
  for (let i = startCounter; i <= endCounter; i++) {
    ids.push(formatDisplayId(prefix, i));
  }
  return ids;
}
