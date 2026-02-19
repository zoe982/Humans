import { auditLog } from "@humans/db/schema";
import { createId } from "@humans/db";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "@humans/db/schema";

type DB = DrizzleD1Database<typeof schema>;

export interface FieldDiff {
  old: unknown;
  new: unknown;
}

export function computeDiff(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
): Record<string, FieldDiff> | null {
  const diff: Record<string, FieldDiff> = {};

  for (const key of Object.keys(newValues)) {
    const oldVal = oldValues[key];
    const newVal = newValues[key];
    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);
    if (oldStr !== newStr) {
      diff[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
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
