import { eq, sql, ilike, or, and, desc, asc } from "drizzle-orm";
import { generalLeads, generalLeadStatuses, activities, colleagues, humans, emails, phones, socialIds, socialIdPlatformsConfig, leadScores } from "@humans/db/schema";
import type { GeneralLeadStatus } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { AppError, notFound, badRequest, conflict } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { completeNextAction } from "./entity-next-actions";
import { createEmail, updateEmail } from "./emails";
import { createPhoneNumber, updatePhoneNumber } from "./phone-numbers";
import {
  frontFetch,
  classifyChannel,
  resolveAuthorName,
  assertPaginated,
  isFrontConversation,
  isRecord,
  type FrontMessage,
  type FrontConversation,
} from "./front-sync";
import type { DB } from "./types";

const generalLeadStatusesSet = new Set<string>(generalLeadStatuses);

function isGeneralLeadStatus(value: string): value is GeneralLeadStatus {
  return generalLeadStatusesSet.has(value);
}

function hasDuplicateDetails(d: unknown): d is { existingId: string } {
  return (
    d != null &&
    typeof d === "object" &&
    "existingId" in d &&
    typeof (d as Record<string, unknown>)['existingId'] === "string"
  );
}

function toGeneralLeadStatus(value: string): GeneralLeadStatus {
  return isGeneralLeadStatus(value) ? value : "open";
}

const CLOSED_STATUSES = ["closed_converted", "closed_lost"];

// ─── List ────────────────────────────────────────────────────────

export async function listGeneralLeads(
  db: DB,
  page: number,
  limit: number,
  filters: { q?: string | undefined; status?: string | undefined; convertedHumanId?: string | undefined },
): Promise<{ data: { convertedHumanDisplayId: string | null; convertedHumanName: string | null; scoreTotal: number | null; id: string; displayId: string; status: string; firstName: string; middleName: string | null; lastName: string; notes: string | null; rejectReason: string | null; lossReason: string | null; convertedHumanId: string | null; ownerId: string | null; createdAt: string; updatedAt: string; ownerName: string | null }[]; meta: { page: number; limit: number; total: number } }> {
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.status != null) conditions.push(eq(generalLeads.status, toGeneralLeadStatus(filters.status)));
  if (filters.convertedHumanId != null) conditions.push(eq(generalLeads.convertedHumanId, filters.convertedHumanId));
  if (filters.q != null) {
    const orCondition = or(
      ilike(generalLeads.displayId, `%${filters.q}%`),
      ilike(generalLeads.notes, `%${filters.q}%`),
      ilike(generalLeads.firstName, `%${filters.q}%`),
      ilike(generalLeads.lastName, `%${filters.q}%`),
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
      lossReason: generalLeads.lossReason,
      convertedHumanId: generalLeads.convertedHumanId,
      ownerId: generalLeads.ownerId,
      createdAt: generalLeads.createdAt,
      updatedAt: generalLeads.updatedAt,
      ownerName: colleagues.name,
      scoreTotal: leadScores.scoreTotal,
    })
    .from(generalLeads)
    .leftJoin(colleagues, eq(generalLeads.ownerId, colleagues.id))
    .leftJoin(leadScores, eq(leadScores.generalLeadId, generalLeads.id))
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

export async function getGeneralLead(db: DB, id: string): Promise<{ convertedHumanDisplayId: string | null; convertedHumanName: string | null; activities: (typeof activities.$inferSelect)[]; emails: (typeof emails.$inferSelect)[]; phoneNumbers: (typeof phones.$inferSelect)[]; socialIds: ((typeof socialIds.$inferSelect) & { platformName: string | null })[]; id: string; displayId: string; status: string; firstName: string; middleName: string | null; lastName: string; notes: string | null; rejectReason: string | null; lossReason: string | null; convertedHumanId: string | null; ownerId: string | null; createdAt: string; updatedAt: string; ownerName: string | null }> {
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
      lossReason: generalLeads.lossReason,
      convertedHumanId: generalLeads.convertedHumanId,
      ownerId: generalLeads.ownerId,
      source: generalLeads.source,
      channel: generalLeads.channel,
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

  // Linked emails, phones, and social IDs
  const leadEmails = await db.select().from(emails).where(eq(emails.generalLeadId, id));
  const leadPhones = await db.select().from(phones).where(eq(phones.generalLeadId, id));
  const leadSocialIds = await db.select().from(socialIds).where(eq(socialIds.generalLeadId, id));

  // Enrich social IDs with platform names
  const allPlatforms = leadSocialIds.length > 0
    ? await db.select().from(socialIdPlatformsConfig)
    : [];
  const enrichedSocialIds = leadSocialIds.map((s) => {
    const platform = s.platformId != null ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return { ...s, platformName: platform?.name ?? null };
  });

  return {
    ...lead,
    convertedHumanDisplayId,
    convertedHumanName,
    activities: leadActivities,
    emails: leadEmails,
    phoneNumbers: leadPhones,
    socialIds: enrichedSocialIds,
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
  data: { firstName?: string | undefined; middleName?: string | null | undefined; lastName?: string | undefined; notes?: string | undefined; ownerId?: string | null | undefined; source?: string | null | undefined; channel?: string | null | undefined },
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
  if (data.source !== undefined) {
    oldValues["source"] = existing.source;
    newValues["source"] = data.source;
    updateFields["source"] = data.source;
  }
  if (data.channel !== undefined) {
    oldValues["channel"] = existing.channel;
    newValues["channel"] = data.channel;
    updateFields["channel"] = data.channel;
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
  data: { status: string; rejectReason?: string | undefined; lossReason?: string | undefined },
  colleagueId: string,
): Promise<{ data: typeof generalLeads.$inferSelect | undefined }> {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  // closed_converted must go through the convert/link-human endpoint
  if (data.status === "closed_converted") {
    throw badRequest(ERROR_CODES.GENERAL_LEAD_INVALID_STATUS_TRANSITION, "Use the convert endpoint to close as converted");
  }

  // Cannot transition from closed statuses
  if (CLOSED_STATUSES.includes(existing.status)) {
    throw badRequest(ERROR_CODES.GENERAL_LEAD_INVALID_STATUS_TRANSITION, "Cannot change status of a closed lead");
  }

  // closed_lost requires lossReason
  if (data.status === "closed_lost") {
    if (data.lossReason == null || data.lossReason.trim() === "") {
      throw badRequest(ERROR_CODES.GENERAL_LEAD_LOSS_REASON_REQUIRED, "Loss reason is required for closed_lost");
    }
  }

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = { status: data.status, updatedAt: now };
  if (data.lossReason !== undefined) {
    updateFields["lossReason"] = data.lossReason;
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

  // Add humanId to linked emails/phones/social-ids (additive — keeps generalLeadId)
  await db.update(emails).set({ humanId }).where(eq(emails.generalLeadId, id));
  await db.update(phones).set({ humanId }).where(eq(phones.generalLeadId, id));
  await db.update(socialIds).set({ humanId }).where(eq(socialIds.generalLeadId, id));

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

// ─── Link Human ───────────────────────────────────────────────────

export async function linkHumanToGeneralLead(
  db: DB,
  leadId: string,
  humanId: string,
  colleagueId: string,
): Promise<void> {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, leadId),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  const human = await db.query.humans.findFirst({ where: eq(humans.id, humanId) });
  if (human == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  // Idempotent — already linked to same human
  if (existing.convertedHumanId === humanId) return;

  // Conflict — linked to a different human
  if (existing.convertedHumanId != null) {
    throw conflict(ERROR_CODES.LEAD_ALREADY_LINKED, "Lead is already linked to a different human");
  }

  const now = new Date().toISOString();
  await db.update(generalLeads).set({
    convertedHumanId: humanId,
    updatedAt: now,
  }).where(eq(generalLeads.id, leadId));

  // Dual-associate activities (keep generalLeadId, add humanId)
  await db.update(activities).set({ humanId }).where(
    and(eq(activities.generalLeadId, leadId), sql`${activities.humanId} IS NULL`),
  );

  // Dual-associate emails/phones/socialIds
  await db.update(emails).set({ humanId }).where(
    and(eq(emails.generalLeadId, leadId), sql`${emails.humanId} IS NULL`),
  );
  await db.update(phones).set({ humanId }).where(
    and(eq(phones.generalLeadId, leadId), sql`${phones.humanId} IS NULL`),
  );
  await db.update(socialIds).set({ humanId }).where(
    and(eq(socialIds.generalLeadId, leadId), sql`${socialIds.humanId} IS NULL`),
  );

  await logAuditEntry({
    db,
    colleagueId,
    action: "LINK_HUMAN",
    entityType: "general_lead",
    entityId: leadId,
    changes: { convertedHumanId: { old: null, new: humanId } },
  });
}

export async function unlinkHumanFromGeneralLead(
  db: DB,
  leadId: string,
  colleagueId: string,
): Promise<void> {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, leadId),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  const previousHumanId = existing.convertedHumanId;
  if (previousHumanId == null) return; // Nothing to unlink

  await db.update(generalLeads).set({
    convertedHumanId: null,
    updatedAt: new Date().toISOString(),
  }).where(eq(generalLeads.id, leadId));

  // Clear humanId on records associated with this lead (compound WHERE — don't touch records linked directly to human)
  await db.update(activities).set({ humanId: null }).where(
    and(eq(activities.generalLeadId, leadId), eq(activities.humanId, previousHumanId)),
  );
  await db.update(emails).set({ humanId: null }).where(
    and(eq(emails.generalLeadId, leadId), eq(emails.humanId, previousHumanId)),
  );
  await db.update(phones).set({ humanId: null }).where(
    and(eq(phones.generalLeadId, leadId), eq(phones.humanId, previousHumanId)),
  );
  await db.update(socialIds).set({ humanId: null }).where(
    and(eq(socialIds.generalLeadId, leadId), eq(socialIds.humanId, previousHumanId)),
  );

  await logAuditEntry({
    db,
    colleagueId,
    action: "UNLINK_HUMAN",
    entityType: "general_lead",
    entityId: leadId,
    changes: { convertedHumanId: { old: previousHumanId, new: null } },
  });
}

// ─── Delete ──────────────────────────────────────────────────────

export async function deleteGeneralLead(db: DB, id: string): Promise<void> {
  const existing = await db.query.generalLeads.findFirst({
    where: eq(generalLeads.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GENERAL_LEAD_NOT_FOUND, "General lead not found");
  }

  // Nullify generalLeadId on linked emails/phones/social-ids
  await db.update(emails).set({ generalLeadId: null }).where(eq(emails.generalLeadId, id));
  await db.update(phones).set({ generalLeadId: null }).where(eq(phones.generalLeadId, id));
  await db.update(socialIds).set({ generalLeadId: null }).where(eq(socialIds.generalLeadId, id));
  // Nullify generalLeadId on linked activities
  await db.update(activities).set({ generalLeadId: null }).where(eq(activities.generalLeadId, id));
  // Delete lead scores (they belong to this lead, not shared)
  await db.delete(leadScores).where(eq(leadScores.generalLeadId, id));
  await db.delete(generalLeads).where(eq(generalLeads.id, id));
}

// ─── Import from Front ──────────────────────────────────────────

export interface ImportFromFrontResult {
  lead: { id: string; displayId: string };
  activitiesImported: number;
  contactHandle: string | null;
  contactName: string | null;
}

/**
 * Parse a contact name string into firstName and lastName.
 * "John Doe" → { firstName: "John", lastName: "Doe" }
 * "John Michael Doe" → { firstName: "John", lastName: "Michael Doe" }
 * "Madonna" → { firstName: "Madonna", lastName: "(unknown)" }
 */
function parseName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return { firstName: "(unknown)", lastName: "(unknown)" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0] ?? "(unknown)", lastName: "(unknown)" };
  }
  return { firstName: parts[0] ?? "(unknown)", lastName: parts.slice(1).join(" ") };
}

export async function importLeadFromFront(
  db: DB,
  frontId: string,
  frontToken: string,
  colleagueId: string,
): Promise<ImportFromFrontResult> {
  // 1. Resolve to conversation ID
  let conversationId: string;
  if (frontId.startsWith("msg_")) {
    const msgData = await frontFetch(`https://api2.frontapp.com/messages/${frontId}`, frontToken);
    // Front API returns _links.related.conversation as a plain URL string
    const links = isRecord(msgData) && isRecord(msgData["_links"]) ? msgData["_links"] : undefined;
    const related = links !== undefined && isRecord(links["related"]) ? links["related"] : undefined;
    const convUrl = related !== undefined && typeof related["conversation"] === "string" ? related["conversation"] : undefined;
    if (convUrl === undefined) {
      throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Could not resolve message to conversation");
    }
    const urlParts = convUrl.split("/");
    const extractedId = urlParts[urlParts.length - 1] ?? "";
    if (!extractedId.startsWith("cnv_")) {
      throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Could not resolve message to conversation");
    }
    conversationId = extractedId;
  } else if (frontId.startsWith("cnv_")) {
    conversationId = frontId;
  } else {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid Front ID format: must start with msg_ or cnv_");
  }

  // 2. Duplicate check
  const existing = await db
    .select({ id: generalLeads.id, displayId: generalLeads.displayId })
    .from(generalLeads)
    .where(eq(generalLeads.frontConversationId, conversationId))
    .limit(1);
  if (existing.length > 0) {
    throw badRequest(
      ERROR_CODES.FRONT_IMPORT_ALREADY_EXISTS,
      `Conversation already imported as ${existing[0]?.displayId ?? "unknown"}`,
    );
  }

  // 3. Fetch conversation
  const convRaw = await frontFetch(`https://api2.frontapp.com/conversations/${conversationId}`, frontToken);
  if (!isFrontConversation(convRaw)) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid conversation response from Front");
  }
  const conversation: FrontConversation = convRaw;

  // 4. Fetch messages
  const messagesUrl = `https://api2.frontapp.com/conversations/${conversationId}/messages`;
  const msgResponse = assertPaginated<FrontMessage>(await frontFetch(messagesUrl, frontToken), "messages");
  const allMessages = msgResponse._results;

  // Paginate if needed
  let nextUrl = msgResponse._pagination.next;
  while (nextUrl != null) {
    const nextPage = assertPaginated<FrontMessage>(await frontFetch(nextUrl, frontToken), "messages page");
    allMessages.push(...nextPage._results);
    nextUrl = nextPage._pagination.next;
  }

  // 5. Extract contact — conversation.recipient; if colleague, fall through
  let contactHandle = conversation.recipient?.handle ?? "";
  let contactName = conversation.recipient?.name ?? null;

  // Load all colleagues for resolveAuthorName and colleague detection
  const allColleagues = await db
    .select({ id: colleagues.id, email: colleagues.email, name: colleagues.name })
    .from(colleagues);

  if (contactHandle !== "") {
    const isColleague = allColleagues.some(
      (c) => c.email.toLowerCase() === contactHandle.toLowerCase(),
    );
    if (isColleague) {
      // Fall through to message recipients to find external contact
      for (const message of allMessages) {
        for (const r of message.recipients) {
          if (r.role === "to") {
            const recipientIsColleague = allColleagues.some(
              (c) => c.email.toLowerCase() === r.handle.toLowerCase(),
            );
            if (!recipientIsColleague) {
              contactHandle = r.handle;
              contactName = r.name ?? null;
              break;
            }
          }
        }
        if (contactHandle !== conversation.recipient?.handle) break;
      }
    }
  }

  if (contactHandle === "") {
    throw badRequest(ERROR_CODES.FRONT_IMPORT_NO_CONTACT, "No contact found on conversation");
  }

  // 6. Parse name
  const displayName = contactName ?? contactHandle;
  const { firstName, lastName } = parseName(displayName);

  // 7. Create lead
  const lead = await createGeneralLead(db, { firstName, lastName }, colleagueId);

  // Set frontConversationId
  await db
    .update(generalLeads)
    .set({ frontConversationId: conversationId })
    .where(eq(generalLeads.id, lead.id));

  // 8. Classify channel and link contact
  const firstMsg = allMessages.find((m) => !m.is_draft);
  const activityType = classifyChannel(undefined, contactHandle, firstMsg?.type);

  if (contactHandle.includes("@")) {
    try {
      await createEmail(db, { generalLeadId: lead.id, email: contactHandle });
    } catch (err) {
      if (err instanceof AppError && err.code === ERROR_CODES.EMAIL_DUPLICATE && hasDuplicateDetails(err.details)) {
        await updateEmail(db, err.details.existingId, { generalLeadId: lead.id });
      } else throw err;
    }
  } else if (/^\+?\d[\d\s-]{6,}$/.test(contactHandle)) {
    try {
      await createPhoneNumber(db, {
        generalLeadId: lead.id,
        phoneNumber: contactHandle,
        hasWhatsapp: activityType === "whatsapp_message",
      });
    } catch (err) {
      if (err instanceof AppError && err.code === ERROR_CODES.PHONE_DUPLICATE && hasDuplicateDetails(err.details)) {
        await updatePhoneNumber(db, err.details.existingId, { generalLeadId: lead.id });
      } else throw err;
    }
  }

  // 9. Import activities
  let activitiesImported = 0;

  for (const message of allMessages) {
    if (message.is_draft) continue;

    const direction = message.is_inbound ? "Inbound" : "Outbound";
    const authorInfo = resolveAuthorName(message, conversation, allColleagues);
    const noteLines: string[] = [];
    noteLines.push(`${direction} from ${authorInfo}`);
    if (message.text !== "") {
      noteLines.push(message.text);
    } else if (message.blurb !== "") {
      noteLines.push(message.blurb);
    }

    const subject =
      conversation.subject !== ""
        ? conversation.subject
        : `${activityType === "email" ? "Email" : activityType === "whatsapp_message" ? "WhatsApp" : "Social"} conversation`;
    const activityDate = new Date(message.created_at * 1000).toISOString();
    const displayId = await nextDisplayId(db, "ACT");

    const activity = {
      id: createId(),
      displayId,
      type: activityType,
      subject: subject.slice(0, 500),
      body: message.text !== "" ? message.text : message.blurb !== "" ? message.blurb : null,
      notes: noteLines.join("\n"),
      activityDate,
      humanId: null,
      accountId: null,
      routeSignupId: null,
      websiteBookingRequestId: null,
      generalLeadId: lead.id,
      gmailId: null,
      frontId: message.id,
      frontConversationId: conversationId,
      frontContactHandle: contactHandle,
      senderName: authorInfo !== "Unknown" ? authorInfo : null,
      direction: message.is_inbound ? "inbound" : "outbound",
      syncRunId: null,
      colleagueId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(activities).values(activity).onConflictDoNothing();
    activitiesImported++;
  }

  // 10. Return
  return {
    lead: { id: lead.id, displayId: lead.displayId },
    activitiesImported,
    contactHandle,
    contactName,
  };
}
