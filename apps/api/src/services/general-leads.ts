import { eq, sql, like, or, and, desc, asc } from "drizzle-orm";
import { generalLeads, activities, colleagues, humans } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound, badRequest } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

const CLOSED_STATUSES = ["closed_converted", "closed_rejected"];

// ─── List ────────────────────────────────────────────────────────

export async function listGeneralLeads(
  db: DB,
  page: number,
  limit: number,
  filters: { q?: string; status?: string; source?: string; convertedHumanId?: string },
) {
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.status) conditions.push(eq(generalLeads.status, filters.status));
  if (filters.source) conditions.push(eq(generalLeads.source, filters.source));
  if (filters.convertedHumanId) conditions.push(eq(generalLeads.convertedHumanId, filters.convertedHumanId));
  if (filters.q) {
    conditions.push(
      or(
        like(generalLeads.displayId, `%${filters.q}%`),
        like(generalLeads.notes, `%${filters.q}%`),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ total: sql<number>`count(*)` }).from(generalLeads).where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const rows = await db
    .select({
      id: generalLeads.id,
      displayId: generalLeads.displayId,
      status: generalLeads.status,
      source: generalLeads.source,
      notes: generalLeads.notes,
      rejectReason: generalLeads.rejectReason,
      convertedHumanId: generalLeads.convertedHumanId,
      ownerId: generalLeads.ownerId,
      createdAt: generalLeads.createdAt,
      updatedAt: generalLeads.updatedAt,
      ownerName: colleagues.name,
    })
    .from(generalLeads)
    .leftJoin(colleagues, eq(generalLeads.ownerId, colleagues.id))
    .where(whereClause)
    .orderBy(
      asc(sql`CASE WHEN ${generalLeads.status} IN ('open', 'qualified') THEN 0 ELSE 1 END`),
      desc(generalLeads.createdAt),
    )
    .limit(limit)
    .offset(offset);

  // Fetch converted human display IDs
  const convertedIds = rows.map((r) => r.convertedHumanId).filter((id): id is string => id != null);
  const convertedHumans = convertedIds.length > 0
    ? await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans).where(sql`${humans.id} IN ${convertedIds}`)
    : [];

  const data = rows.map((row) => {
    const convertedHuman = row.convertedHumanId ? convertedHumans.find((h) => h.id === row.convertedHumanId) : null;
    return {
      ...row,
      convertedHumanDisplayId: convertedHuman?.displayId ?? null,
      convertedHumanName: convertedHuman ? `${convertedHuman.firstName} ${convertedHuman.lastName}` : null,
    };
  });

  return { data, meta: { page, limit, total } };
}

// ─── Detail ──────────────────────────────────────────────────────

export async function getGeneralLead(db: DB, id: string) {
  const rows = await db
    .select({
      id: generalLeads.id,
      displayId: generalLeads.displayId,
      status: generalLeads.status,
      source: generalLeads.source,
      notes: generalLeads.notes,
      rejectReason: generalLeads.rejectReason,
      convertedHumanId: generalLeads.convertedHumanId,
      ownerId: generalLeads.ownerId,
      createdAt: generalLeads.createdAt,
      updatedAt: generalLeads.updatedAt,
      ownerName: colleagues.name,
    })
    .from(generalLeads)
    .leftJoin(colleagues, eq(generalLeads.ownerId, colleagues.id))
    .where(eq(generalLeads.id, id));

  const lead = rows[0];
  if (lead == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  // Converted human info
  let convertedHumanDisplayId: string | null = null;
  let convertedHumanName: string | null = null;
  if (lead.convertedHumanId) {
    const human = await db.query.humans.findFirst({ where: eq(humans.id, lead.convertedHumanId) });
    if (human) {
      convertedHumanDisplayId = human.displayId;
      convertedHumanName = `${human.firstName} ${human.lastName}`;
    }
  }

  // Activities
  const leadActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.generalLeadId, id))
    .orderBy(desc(activities.activityDate));

  return {
    ...lead,
    convertedHumanDisplayId,
    convertedHumanName,
    activities: leadActivities,
  };
}

// ─── Create ──────────────────────────────────────────────────────

export async function createGeneralLead(
  db: DB,
  data: { source: string; notes?: string; ownerId?: string },
  colleagueId: string,
) {
  const now = new Date().toISOString();
  const id = createId();
  const displayId = await nextDisplayId(db, "LEA");

  await db.insert(generalLeads).values({
    id,
    displayId,
    status: "open",
    source: data.source,
    notes: data.notes ?? null,
    ownerId: data.ownerId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await logAuditEntry({
    db,
    colleagueId,
    action: "CREATE",
    entityType: "general_lead",
    entityId: id,
    changes: { created: { old: null, new: displayId } },
  });

  return { id, displayId };
}

// ─── Update ──────────────────────────────────────────────────────

export async function updateGeneralLead(
  db: DB,
  id: string,
  data: { notes?: string; ownerId?: string | null },
  colleagueId: string,
) {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  const now = new Date().toISOString();
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const updateFields: Record<string, unknown> = { updatedAt: now };

  if (data.notes !== undefined) {
    oldValues["notes"] = existing.notes;
    newValues["notes"] = data.notes;
    updateFields["notes"] = data.notes;
  }
  if (data.ownerId !== undefined) {
    if (CLOSED_STATUSES.includes(existing.status)) {
      throw badRequest(ERROR_CODES.GENERAL_LEAD_CLOSED, "Cannot change owner on a closed lead");
    }
    oldValues["ownerId"] = existing.ownerId;
    newValues["ownerId"] = data.ownerId;
    updateFields["ownerId"] = data.ownerId;
  }

  await db.update(generalLeads).set(updateFields).where(eq(generalLeads.id, id));

  const diff = computeDiff(oldValues, newValues);
  if (diff) {
    await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "general_lead",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  return { data: updated };
}

// ─── Status ──────────────────────────────────────────────────────

export async function updateGeneralLeadStatus(
  db: DB,
  id: string,
  data: { status: string; rejectReason?: string },
  colleagueId: string,
) {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  // Cannot transition from closed statuses
  if (CLOSED_STATUSES.includes(existing.status)) {
    throw badRequest(ERROR_CODES.GENERAL_LEAD_INVALID_STATUS_TRANSITION, "Cannot change status of a closed lead");
  }

  // closed_rejected requires rejectReason
  if (data.status === "closed_rejected") {
    if (!data.rejectReason || data.rejectReason.trim() === "") {
      throw badRequest(ERROR_CODES.GENERAL_LEAD_REJECT_REASON_REQUIRED, "Reject reason is required for closed_rejected");
    }
  }

  // closed_converted must go through the convert endpoint
  if (data.status === "closed_converted") {
    throw badRequest(ERROR_CODES.GENERAL_LEAD_INVALID_STATUS_TRANSITION, "Use the convert endpoint to set closed_converted status");
  }

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = { status: data.status, updatedAt: now };
  if (data.rejectReason) {
    updateFields["rejectReason"] = data.rejectReason;
  }

  await db.update(generalLeads).set(updateFields).where(eq(generalLeads.id, id));

  const diff = computeDiff({ status: existing.status }, { status: data.status });
  if (diff) {
    await logAuditEntry({
      db,
      colleagueId,
      action: "STATUS_CHANGE",
      entityType: "general_lead",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  return { data: updated };
}

// ─── Convert ─────────────────────────────────────────────────────

export async function convertGeneralLead(
  db: DB,
  id: string,
  humanId: string,
  colleagueId: string,
) {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  if (CLOSED_STATUSES.includes(existing.status)) {
    throw badRequest(ERROR_CODES.GENERAL_LEAD_ALREADY_CONVERTED, "Lead is already closed");
  }

  // Verify the human exists
  const human = await db.query.humans.findFirst({ where: eq(humans.id, humanId) });
  if (human == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const now = new Date().toISOString();
  await db.update(generalLeads).set({
    status: "closed_converted",
    convertedHumanId: humanId,
    updatedAt: now,
  }).where(eq(generalLeads.id, id));

  await logAuditEntry({
    db,
    colleagueId,
    action: "STATUS_CHANGE",
    entityType: "general_lead",
    entityId: id,
    changes: {
      status: { old: existing.status, new: "closed_converted" },
      convertedHumanId: { old: null, new: humanId },
    },
  });

  const updated = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  return { data: updated };
}

// ─── Delete ──────────────────────────────────────────────────────

export async function deleteGeneralLead(db: DB, id: string) {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  // Nullify generalLeadId on linked activities
  await db.update(activities).set({ generalLeadId: null }).where(eq(activities.generalLeadId, id));
  await db.delete(generalLeads).where(eq(generalLeads.id, id));
}
