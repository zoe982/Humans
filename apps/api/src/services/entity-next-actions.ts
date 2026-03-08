import { eq, and } from "drizzle-orm";
import { entityNextActions } from "@humans/db/schema";
import { createId } from "@humans/db";
import { computeDiff, logAuditEntry } from "../lib/audit";
import type { DB } from "./types";

type EntityType = "route_signup" | "general_lead" | "website_booking_request" | "evacuation_lead";

export async function getNextAction(
  db: DB,
  entityType: EntityType,
  entityId: string,
): Promise<typeof entityNextActions.$inferSelect | undefined> {
  return db.query.entityNextActions.findFirst({
    where: and(
      eq(entityNextActions.entityType, entityType),
      eq(entityNextActions.entityId, entityId),
    ),
  });
}

export async function updateNextAction(
  db: DB,
  entityType: EntityType,
  entityId: string,
  data: { ownerId: string; description: string; type: string; dueDate: string; cadenceNote?: string | null | undefined },
  colleagueId: string,
): Promise<typeof entityNextActions.$inferSelect | undefined> {
  const existing = await getNextAction(db, entityType, entityId);

  const now = new Date().toISOString();

  if (existing != null) {
    await db
      .update(entityNextActions)
      .set({
        ownerId: data.ownerId,
        description: data.description,
        type: data.type,
        dueDate: data.dueDate,
        cadenceNote: data.cadenceNote ?? null,
        completedAt: null,
        updatedAt: now,
      })
      .where(eq(entityNextActions.id, existing.id));

    const diff = computeDiff(
      { description: existing.description, type: existing.type, dueDate: existing.dueDate, cadenceNote: existing.cadenceNote },
      { description: data.description, type: data.type, dueDate: data.dueDate, cadenceNote: data.cadenceNote ?? null },
    );
    if (diff != null) {
      await logAuditEntry({
        db,
        colleagueId,
        action: "UPDATE",
        entityType,
        entityId,
        changes: diff,
      });
    }
  } else {
    const id = createId();
    await db.insert(entityNextActions).values({
      id,
      entityType,
      entityId,
      ownerId: data.ownerId,
      description: data.description,
      type: data.type,
      dueDate: data.dueDate,
      cadenceNote: data.cadenceNote ?? null,
      startDate: now,
      createdAt: now,
      updatedAt: now,
    });

    await logAuditEntry({
      db,
      colleagueId,
      action: "CREATE",
      entityType,
      entityId,
      changes: { description: { old: null, new: data.description } },
    });
  }

  return getNextAction(db, entityType, entityId);
}

export async function completeNextAction(
  db: DB,
  entityType: EntityType,
  entityId: string,
  colleagueId: string,
): Promise<void> {
  const existing = await getNextAction(db, entityType, entityId);
  if (existing?.description == null) return;

  await db
    .delete(entityNextActions)
    .where(eq(entityNextActions.id, existing.id));

  await logAuditEntry({
    db,
    colleagueId,
    action: "NEXT_ACTION_DONE",
    entityType,
    entityId,
    changes: { description: { old: existing.description, new: null } },
  });
}
