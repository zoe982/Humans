import { eq, desc } from "drizzle-orm";
import { colleagues, auditLog } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound, conflict } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listColleagues(db: DB) {
  const allColleagues = await db.select().from(colleagues);
  return allColleagues;
}

export async function getColleague(db: DB, id: string) {
  const colleague = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, id),
  });
  if (colleague == null) {
    throw notFound(ERROR_CODES.COLLEAGUE_NOT_FOUND, "Colleague not found");
  }
  return colleague;
}

export async function createColleague(
  db: DB,
  data: {
    email: string;
    firstName: string;
    middleNames?: string | null;
    lastName: string;
    role: string;
  },
) {
  const now = new Date().toISOString();

  // Check for duplicate email
  const existing = await db.query.colleagues.findFirst({
    where: eq(colleagues.email, data.email),
  });
  if (existing != null) {
    throw conflict(ERROR_CODES.COLLEAGUE_EMAIL_EXISTS, "Colleague with this email already exists");
  }

  const displayName = [data.firstName, data.middleNames, data.lastName].filter(Boolean).join(" ");
  const displayId = await nextDisplayId(db, "COL");

  const newColleague = {
    id: createId(),
    displayId,
    email: data.email,
    firstName: data.firstName,
    middleNames: data.middleNames ?? null,
    lastName: data.lastName,
    name: displayName,
    avatarUrl: null,
    googleId: null,
    role: data.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(colleagues).values(newColleague);
  return newColleague;
}

export async function updateColleague(
  db: DB,
  id: string,
  data: {
    firstName?: string;
    middleNames?: string | null;
    lastName?: string;
    role?: string;
    isActive?: boolean;
  },
) {
  const existing = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.COLLEAGUE_NOT_FOUND, "Colleague not found");
  }

  // Build update, recalculate display name if name fields changed
  const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.firstName !== undefined) updateFields["firstName"] = data.firstName;
  if (data.middleNames !== undefined) updateFields["middleNames"] = data.middleNames;
  if (data.lastName !== undefined) updateFields["lastName"] = data.lastName;
  if (data.role !== undefined) updateFields["role"] = data.role;
  if (data.isActive !== undefined) updateFields["isActive"] = data.isActive;

  // Recalculate display name
  const newFirst = data.firstName ?? existing.firstName;
  const newMiddle = data.middleNames !== undefined ? data.middleNames : existing.middleNames;
  const newLast = data.lastName ?? existing.lastName;
  updateFields["name"] = [newFirst, newMiddle, newLast].filter(Boolean).join(" ");

  await db
    .update(colleagues)
    .set(updateFields)
    .where(eq(colleagues.id, id));

  const updated = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, id),
  });
  return updated;
}

export async function listAuditLog(db: DB, limit: number, offset: number) {
  const logs = await db
    .select({
      id: auditLog.id,
      colleagueId: auditLog.colleagueId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      ipAddress: auditLog.ipAddress,
      createdAt: auditLog.createdAt,
      colleagueName: colleagues.name,
    })
    .from(auditLog)
    .leftJoin(colleagues, eq(auditLog.colleagueId, colleagues.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return logs;
}
