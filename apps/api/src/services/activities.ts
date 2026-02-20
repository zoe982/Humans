import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { activities, humans, accounts, geoInterestExpressions, geoInterests } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

interface ActivityFilters {
  humanId?: string;
  accountId?: string;
  routeSignupId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
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
  if (filters.type) conditions.push(eq(activities.type, filters.type as typeof activities.type.enumValues[number]));
  if (filters.dateFrom) conditions.push(gte(activities.activityDate, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(activities.activityDate, filters.dateTo));

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

  // Attach human names and account names for the dedicated activities page
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const data = results.map((a) => {
    const human = a.humanId ? allHumans.find((h) => h.id === a.humanId) : null;
    const account = a.accountId ? allAccounts.find((ac) => ac.id === a.accountId) : null;
    return {
      ...a,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      accountId: a.accountId,
      accountName: account?.name ?? null,
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

  // Enrich with human name and account name
  const human = activity.humanId
    ? await db.query.humans.findFirst({ where: eq(humans.id, activity.humanId) })
    : null;
  const account = activity.accountId
    ? await db.query.accounts.findFirst({ where: eq(accounts.id, activity.accountId) })
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

  return {
    ...activity,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    accountName: account?.name ?? null,
    geoInterestExpressions: geoExpressions,
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
    gmailId?: string | null;
    frontId?: string | null;
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
    gmailId: data.gmailId ?? null,
    frontId: data.frontId ?? null,
    createdByColleagueId: colleagueId,
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
    gmailId?: string | null;
    frontId?: string | null;
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
  if (data.gmailId !== undefined) updateFields["gmailId"] = data.gmailId;
  if (data.frontId !== undefined) updateFields["frontId"] = data.frontId;

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

  await db.delete(activities).where(eq(activities.id, id));
}
