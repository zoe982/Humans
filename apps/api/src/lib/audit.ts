import { auditLog } from "@humans/db/schema";
import { createId } from "@humans/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@humans/db/schema";

type DB = PostgresJsDatabase<typeof schema>;

export interface FieldDiff {
  old: unknown;
  new: unknown;
}

export function computeDiff(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): Record<string, FieldDiff> | null {
  const oldMap = new Map(Object.entries(oldValues));
  const newMap = new Map(Object.entries(newValues));
  const entries: [string, FieldDiff][] = [];

  for (const [key, newVal] of newMap) {
    const oldVal = oldMap.get(key);
    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);
    if (oldStr !== newStr) {
      entries.push([key, { old: oldVal ?? null, new: newVal ?? null }]);
    }
  }

  if (entries.length === 0) return null;
  return Object.fromEntries<FieldDiff>(entries);
}

export async function logAuditEntry({
  db,
  colleagueId,
  action,
  entityType,
  entityId,
  changes,
}: {
  db: DB;
  colleagueId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, FieldDiff>;
}): Promise<string> {
  const id = createId();
  await db.insert(auditLog).values({
    id,
    colleagueId,
    action,
    entityType,
    entityId,
     
    changes: changes as Record<string, unknown>,
    createdAt: new Date().toISOString(),
  });
  return id;
}
