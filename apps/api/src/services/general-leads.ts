import { eq, sql, like, or, and, desc, asc } from "drizzle-orm";
import { generalLeads, activities, colleagues, humans, emails, phones } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound, badRequest } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { completeNextAction } from "./entity-next-actions";
import type { DB } from "./types";

const CLOSED_STATUSES = ["closed_converted", "closed_rejected", "closed_no_response"];

// ─── List ────────────────────────────────────────────────────────

export async function listGeneralLeads(
  db: DB,
  page: number,
  limit: number,
  filters: { q?: string | undefined; status?: string | undefined; convertedHumanId?: string | undefined },
): Promise<{ data: { convertedHumanDisplayId: string | null; convertedHumanName: string | null; id: string; displayId: string; status: string; firstName: string; middleName: string | null; lastName: string; notes: string | null; rejectReason: string | null; convertedHumanId: string | null; ownerId: string | null; createdAt: string; updatedAt: string; ownerName: string | null }[]; meta: { page: number; limit: number; total: number } }> {
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.status != null) conditions.push(eq(generalLeads.status, filters.status as typeof generalLeads.$inferSelect.status));
  if (filters.convertedHumanId != null) conditions.push(eq(generalLeads.convertedHumanId, filters.convertedHumanId));
  if (filters.q != null) {
    const orCondition = or(
      like(generalLeads.displayId, `%${filters.q}%`),
      like(generalLeads.notes, `%${filters.q}%`),
      like(generalLeads.firstName, `%${filters.q}%`),
      like(generalLeads.lastName, `%${filters.q}%`),
    );
    if (orCondition != null) conditions.push(orCondition);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ total: sql<number>`count(*)` }).from(generalLeads).where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const rows = await db
    .select({
      id: generalLeads.id,
      displayId: generalLeads.displayId,
      status: generalLeads.status,
      firstName: generalLeads.firstName,
      middleName: generalLeads.middleName,
      lastName: generalLeads.lastName,
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
    const convertedHuman = row.convertedHumanId != null ? convertedHumans.find((h) => h.id === row.convertedHumanId) : null;
    return {
      ...row,
      convertedHumanDisplayId: convertedHuman?.displayId ?? null,
      convertedHumanName: convertedHuman != null ? `${convertedHuman.firstName} ${convertedHuman.lastName}` : null,
    };
  });

  return { data, meta: { page, limit, total } };
}

// ─── Detail ──────────────────────────────────────────────────────

export async function getGeneralLead(db: DB, id: string): Promise<{ convertedHumanDisplayId: string | null; convertedHumanName: string | null; activities: (typeof activities.$inferSelect)[]; emails: (typeof emails.$inferSelect)[]; phoneNumbers: (typeof phones.$inferSelect)[]; id: string; displayId: string; status: string; firstName: string; middleName: string | null; lastName: string; notes: string | null; rejectReason: string | null; convertedHumanId: string | null; ownerId: string | null; createdAt: string; updatedAt: string; ownerName: string | null }> {
  const rows = await db
    .select({
      id: generalLeads.id,
      displayId: generalLeads.displayId,
      status: generalLeads.status,
      firstName: generalLeads.firstName,
      middleName: generalLeads.middleName,
      lastName: generalLeads.lastName,
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
  if (lead.convertedHumanId != null) {
    const human = await db.query.humans.findFirst({ where: eq(humans.id, lead.convertedHumanId) });
    if (human != null) {
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

  // Linked emails and phones
  const leadEmails = await db.select().from(emails).where(eq(emails.generalLeadId, id));
  const leadPhones = await db.select().from(phones).where(eq(phones.generalLeadId, id));

  return {
    ...lead,
    convertedHumanDisplayId,
    convertedHumanName,
    activities: leadActivities,
    emails: leadEmails,
    phoneNumbers: leadPhones,
  };
}

// ─── Create ──────────────────────────────────────────────────────

export async function createGeneralLead(
  db: DB,
  data: { firstName: string; middleName?: string | undefined; lastName: string; notes?: string | undefined; ownerId?: string | undefined },
  colleagueId: string,
): Promise<{ id: string; displayId: string }> {
  const now = new Date().toISOString();
  const id = createId();
  const displayId = await nextDisplayId(db, "LEA");

  await db.insert(generalLeads).values({
    id,
    displayId,
    status: "open",
    firstName: data.firstName,
    middleName: data.middleName ?? null,
    lastName: data.lastName,
    notes: data.notes ?? null,
    ownerId: data.ownerId ?? colleagueId,
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
  data: { firstName?: string | undefined; middleName?: string | null | undefined; lastName?: string | undefined; notes?: string | undefined; ownerId?: string | null | undefined },
  colleagueId: string,
): Promise<{ data: typeof generalLeads.$inferSelect | undefined }> {
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

  if (data.firstName !== undefined) {
    oldValues["firstName"] = existing.firstName;
    newValues["firstName"] = data.firstName;
    updateFields["firstName"] = data.firstName;
  }
  if (data.middleName !== undefined) {
    oldValues["middleName"] = existing.middleName;
    newValues["middleName"] = data.middleName;
    updateFields["middleName"] = data.middleName;
  }
  if (data.lastName !== undefined) {
    oldValues["lastName"] = existing.lastName;
    newValues["lastName"] = data.lastName;
    updateFields["lastName"] = data.lastName;
  }
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
  if (diff != null) {
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
  data: { status: string; rejectReason?: string | undefined },
  colleagueId: string,
): Promise<{ data: typeof generalLeads.$inferSelect | undefined }> {
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
    if (data.rejectReason == null || data.rejectReason.trim() === "") {
      throw badRequest(ERROR_CODES.GENERAL_LEAD_REJECT_REASON_REQUIRED, "Reject reason is required for closed_rejected");
    }
  }

  // closed_converted must go through the convert endpoint
  if (data.status === "closed_converted") {
    throw badRequest(ERROR_CODES.GENERAL_LEAD_INVALID_STATUS_TRANSITION, "Use the convert endpoint to set closed_converted status");
  }

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = { status: data.status, updatedAt: now };
  if (data.rejectReason != null) {
    updateFields["rejectReason"] = data.rejectReason;
  }

  await db.update(generalLeads).set(updateFields).where(eq(generalLeads.id, id));

  const diff = computeDiff({ status: existing.status }, { status: data.status });
  if (diff != null) {
    await logAuditEntry({
      db,
      colleagueId,
      action: "STATUS_CHANGE",
      entityType: "general_lead",
      entityId: id,
      changes: diff,
    });
  }

  // Clear next action when transitioning to a closed status
  if (CLOSED_STATUSES.includes(data.status)) {
    await completeNextAction(db, "general_lead", id, colleagueId);
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
): Promise<{ data: typeof generalLeads.$inferSelect | undefined }> {
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

  // Reparent activities from this general lead to the human
  await db.update(activities).set({
    humanId,
    generalLeadId: null,
    updatedAt: now,
  }).where(eq(activities.generalLeadId, id));

  // Add humanId to linked emails/phones (additive — keeps generalLeadId)
  await db.update(emails).set({ humanId }).where(eq(emails.generalLeadId, id));
  await db.update(phones).set({ humanId }).where(eq(phones.generalLeadId, id));

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

  // Clear next action on conversion (closed status)
  await completeNextAction(db, "general_lead", id, colleagueId);

  const updated = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  return { data: updated };
}

// ─── Delete ──────────────────────────────────────────────────────

export async function deleteGeneralLead(db: DB, id: string): Promise<void> {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  // Nullify generalLeadId on linked emails/phones
  await db.update(emails).set({ generalLeadId: null }).where(eq(emails.generalLeadId, id));
  await db.update(phones).set({ generalLeadId: null }).where(eq(phones.generalLeadId, id));
  // Nullify generalLeadId on linked activities
  await db.update(activities).set({ generalLeadId: null }).where(eq(activities.generalLeadId, id));
  await db.delete(generalLeads).where(eq(generalLeads.id, id));
}
