import { eq, and, gte, lte, sql, desc, like, or } from "drizzle-orm";
import { activities, humans, accounts, colleagues, geoInterestExpressions, geoInterests, routeInterestExpressions, routeInterests } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

interface ActivityFilters {
  humanId?: string;
  accountId?: string;
  routeSignupId?: string;
  websiteBookingRequestId?: string;
  generalLeadId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page: number;
  limit: number;
}

export async function listActivities(db: DB, filters: ActivityFilters) {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters.humanId) conditions.push(eq(activities.humanId, filters.humanId));
  if (filters.accountId) conditions.push(eq(activities.accountId, filters.accountId));
  if (filters.routeSignupId) conditions.push(eq(activities.routeSignupId, filters.routeSignupId));
  if (filters.websiteBookingRequestId) conditions.push(eq(activities.websiteBookingRequestId, filters.websiteBookingRequestId));
  if (filters.generalLeadId) conditions.push(eq(activities.generalLeadId, filters.generalLeadId));
  if (filters.type) conditions.push(eq(activities.type, filters.type as typeof activities.type.enumValues[number]));
  if (filters.dateFrom) conditions.push(gte(activities.activityDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(activities.activityDate, filters.dateTo));
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(or(like(activities.subject, pattern), like(activities.notes, pattern))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: sql<number>`count(*)` })
    .from(activities)
    .where(where);
  const total = countResult[0]?.total ?? 0;

  const results = await db
    .select()
    .from(activities)
    .where(where)
    .orderBy(desc(activities.activityDate))
    .limit(limit)
    .offset(offset);

  // Attach human names, account names, and owner info
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const allColleagues = await db.select().from(colleagues);
  const data = results.map((a) => {
    const human = a.humanId ? allHumans.find((h) => h.id === a.humanId) : null;
    const account = a.accountId ? allAccounts.find((ac) => ac.id === a.accountId) : null;
    const owner = a.colleagueId ? allColleagues.find((c) => c.id === a.colleagueId) : null;
    return {
      ...a,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      accountId: a.accountId,
      accountName: account?.name ?? null,
      ownerId: a.colleagueId,
      ownerName: owner?.name ?? null,
      ownerDisplayId: owner?.displayId ?? null,
    };
  });

  return { data, meta: { page, limit, total } };
}

export async function getActivityDetail(db: DB, id: string) {
  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  if (activity == null) {
    throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
  }

  // Enrich with human name, account name, and owner info
  const human = activity.humanId
    ? await db.query.humans.findFirst({ where: eq(humans.id, activity.humanId) })
    : null;
  const account = activity.accountId
    ? await db.query.accounts.findFirst({ where: eq(accounts.id, activity.accountId) })
    : null;
  const owner = activity.colleagueId
    ? await db.query.colleagues.findFirst({ where: eq(colleagues.id, activity.colleagueId) })
    : null;

  // Fetch linked geo-interest expressions
  const expressions = await db
    .select()
    .from(geoInterestExpressions)
    .where(eq(geoInterestExpressions.activityId, id));

  const allGeoInterests = expressions.length > 0 ? await db.select().from(geoInterests) : [];

  const geoExpressions = expressions.map((expr) => {
    const gi = allGeoInterests.find((g) => g.id === expr.geoInterestId);
    return {
      ...expr,
      city: gi?.city ?? null,
      country: gi?.country ?? null,
    };
  });

  // Fetch linked route-interest expressions
  const routeExpressions = await db
    .select()
    .from(routeInterestExpressions)
    .where(eq(routeInterestExpressions.activityId, id));

  const allRouteInterests = routeExpressions.length > 0
    ? await db.select().from(routeInterests)
    : [];

  const routeExprData = routeExpressions.map((expr) => {
    const ri = allRouteInterests.find((r) => r.id === expr.routeInterestId);
    return {
      ...expr,
      originCity: ri?.originCity ?? null,
      originCountry: ri?.originCountry ?? null,
      destinationCity: ri?.destinationCity ?? null,
      destinationCountry: ri?.destinationCountry ?? null,
    };
  });

  return {
    ...activity,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    accountName: account?.name ?? null,
    ownerId: activity.colleagueId,
    ownerName: owner?.name ?? null,
    ownerDisplayId: owner?.displayId ?? null,
    geoInterestExpressions: geoExpressions,
    routeInterestExpressions: routeExprData,
  };
}

export async function createActivity(
  db: DB,
  data: {
    type?: string;
    subject?: string;
    notes?: string | null;
    activityDate: string;
    humanId?: string | null;
    accountId?: string | null;
    routeSignupId?: string | null;
    websiteBookingRequestId?: string | null;
    generalLeadId?: string | null;
    gmailId?: string | null;
    frontId?: string | null;
    frontConversationId?: string | null;
    syncRunId?: string | null;
  },
  colleagueId: string,
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "ACT");

  const activity = {
    id: createId(),
    displayId,
    type: data.type ?? "email",
    subject: data.subject ?? "",
    body: data.notes ?? null,
    notes: data.notes ?? null,
    activityDate: data.activityDate,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    routeSignupId: data.routeSignupId ?? null,
    websiteBookingRequestId: data.websiteBookingRequestId ?? null,
    generalLeadId: data.generalLeadId ?? null,
    gmailId: data.gmailId ?? null,
    frontId: data.frontId ?? null,
    frontConversationId: data.frontConversationId ?? null,
    syncRunId: data.syncRunId ?? null,
    colleagueId,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(activities).values(activity);
  return activity;
}

export async function updateActivity(
  db: DB,
  id: string,
  data: {
    type?: string;
    subject?: string;
    notes?: string;
    activityDate?: string;
    humanId?: string | null;
    accountId?: string | null;
    routeSignupId?: string | null;
    websiteBookingRequestId?: string | null;
    generalLeadId?: string | null;
    gmailId?: string | null;
    frontId?: string | null;
    frontConversationId?: string | null;
    syncRunId?: string | null;
    colleagueId?: string | null;
  },
) {
  const existing = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
  }

  const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.type !== undefined) updateFields["type"] = data.type;
  if (data.subject !== undefined) updateFields["subject"] = data.subject;
  if (data.notes !== undefined) {
    updateFields["notes"] = data.notes;
    updateFields["body"] = data.notes; // keep body in sync
  }
  if (data.activityDate !== undefined) updateFields["activityDate"] = data.activityDate;
  if (data.humanId !== undefined) updateFields["humanId"] = data.humanId;
  if (data.accountId !== undefined) updateFields["accountId"] = data.accountId;
  if (data.routeSignupId !== undefined) updateFields["routeSignupId"] = data.routeSignupId;
  if (data.websiteBookingRequestId !== undefined) updateFields["websiteBookingRequestId"] = data.websiteBookingRequestId;
  if (data.generalLeadId !== undefined) updateFields["generalLeadId"] = data.generalLeadId;
  if (data.gmailId !== undefined) updateFields["gmailId"] = data.gmailId;
  if (data.frontId !== undefined) updateFields["frontId"] = data.frontId;
  if (data.frontConversationId !== undefined) updateFields["frontConversationId"] = data.frontConversationId;
  if (data.syncRunId !== undefined) updateFields["syncRunId"] = data.syncRunId;
  if (data.colleagueId !== undefined) updateFields["colleagueId"] = data.colleagueId;

  await db.update(activities).set(updateFields).where(eq(activities.id, id));

  const updated = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  return updated;
}

export async function deleteActivity(db: DB, id: string) {
  const existing = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
  }

  // Nullify activityId on any geo-interest expressions referencing this activity
  await db
    .update(geoInterestExpressions)
    .set({ activityId: null })
    .where(eq(geoInterestExpressions.activityId, id));

  // Nullify activityId on any route-interest expressions referencing this activity
  await db
    .update(routeInterestExpressions)
    .set({ activityId: null })
    .where(eq(routeInterestExpressions.activityId, id));

  await db.delete(activities).where(eq(activities.id, id));
}
