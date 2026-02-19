import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import {
  auditLog,
  colleagues,
  humans,
  humanTypes,
  accounts,
  accountTypes,
} from "@humans/db/schema";
import type { HumanType } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { logAuditEntry } from "../lib/audit";
import { notFound, badRequest } from "../lib/errors";
import type { AppContext } from "../types";
import type { FieldDiff } from "../lib/audit";

const auditLogRoutes = new Hono<AppContext>();

auditLogRoutes.use("/*", authMiddleware);

// GET /api/audit-log?entityType=X&entityId=Y
auditLogRoutes.get("/api/audit-log", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const entityType = c.req.query("entityType");
  const entityId = c.req.query("entityId");

  if (!entityType || !entityId) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "entityType and entityId are required");
  }

  const entries = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      createdAt: auditLog.createdAt,
      colleagueId: auditLog.colleagueId,
      colleagueName: colleagues.name,
    })
    .from(auditLog)
    .leftJoin(colleagues, eq(auditLog.colleagueId, colleagues.id))
    .where(
      and(
        eq(auditLog.entityType, entityType),
        eq(auditLog.entityId, entityId),
      ),
    )
    .orderBy(desc(auditLog.createdAt));

  return c.json({ data: entries });
});

// POST /api/audit-log/:id/undo
auditLogRoutes.post("/api/audit-log/:id/undo", requirePermission("createEditRecords"), async (c) => {
  const db = c.get("db");
  const entryId = c.req.param("id");
  const session = c.get("session")!;

  const entry = await db.query.auditLog.findFirst({
    where: eq(auditLog.id, entryId),
  });

  if (!entry) {
    throw notFound(ERROR_CODES.AUDIT_ENTRY_NOT_FOUND, "Audit entry not found");
  }

  const changes = entry.changes as Record<string, FieldDiff> | null;
  if (!changes) {
    throw badRequest(ERROR_CODES.NO_CHANGES_TO_UNDO, "No changes to undo");
  }

  // Build revert values from the "old" side of each diff
  const revertFields: Record<string, unknown> = {};
  const undoChanges: Record<string, FieldDiff> = {};

  for (const [field, diff] of Object.entries(changes)) {
    const typedDiff = diff as FieldDiff;
    revertFields[field] = typedDiff.old;
    undoChanges[field] = { old: typedDiff.new, new: typedDiff.old };
  }

  const now = new Date().toISOString();

  if (entry.entityType === "human") {
    // Separate types from scalar fields
    const { types, ...scalarFields } = revertFields;

    if (Object.keys(scalarFields).length > 0) {
      await db
        .update(humans)
        .set({ ...scalarFields, updatedAt: now })
        .where(eq(humans.id, entry.entityId));
    }

    if (types !== undefined) {
      const typeArray = types as string[];
      await db.delete(humanTypes).where(eq(humanTypes.humanId, entry.entityId));
      for (const type of typeArray) {
        await db.insert(humanTypes).values({
          id: createId(),
          humanId: entry.entityId,
          type: type as HumanType,
          createdAt: now,
        });
      }
    }
  } else if (entry.entityType === "account") {
    const { typeIds, ...scalarFields } = revertFields;

    if (Object.keys(scalarFields).length > 0) {
      await db
        .update(accounts)
        .set({ ...scalarFields, updatedAt: now })
        .where(eq(accounts.id, entry.entityId));
    }

    if (typeIds !== undefined) {
      const typeIdArray = typeIds as string[];
      await db.delete(accountTypes).where(eq(accountTypes.accountId, entry.entityId));
      for (const typeId of typeIdArray) {
        await db.insert(accountTypes).values({
          id: createId(),
          accountId: entry.entityId,
          typeId,
          createdAt: now,
        });
      }
    }
  } else {
    throw badRequest(ERROR_CODES.UNDO_NOT_SUPPORTED, `Undo not supported for entity type: ${entry.entityType}`);
  }

  // Log the undo as a new audit entry
  const undoEntryId = await logAuditEntry({
    db,
    colleagueId: session.colleagueId,
    action: "UNDO",
    entityType: entry.entityType,
    entityId: entry.entityId,
    changes: undoChanges,
  });

  return c.json({ data: { undoEntryId } });
});

export { auditLogRoutes };
