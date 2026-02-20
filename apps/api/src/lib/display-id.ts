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
