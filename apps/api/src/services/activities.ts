import { eq, and, gte, lte, sql, desc, like, or, inArray } from "drizzle-orm";
import { activities, humans, accounts, colleagues, geoInterestExpressions, geoInterests, routeInterestExpressions, routeInterests, activityOpportunities, opportunities } from "@humans/db/schema";
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
  includeLinkedEntities?: boolean;
}

export async function listActivities(db: DB, filters: ActivityFilters): Promise<{ data: ({ humanName: string | null; accountName: string | null; ownerId: string | null; ownerName: string | null; ownerDisplayId: string | null; geoInterestExpressions?: unknown[]; routeInterestExpressions?: unknown[]; linkedOpportunities?: unknown[] } & typeof activities.$inferSelect)[]; meta: { page: number; limit: number; total: number } }> {
  const { page, limit } = filters;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters.humanId != null) conditions.push(eq(activities.humanId, filters.humanId));
  if (filters.accountId != null) conditions.push(eq(activities.accountId, filters.accountId));
  if (filters.routeSignupId != null) conditions.push(eq(activities.routeSignupId, filters.routeSignupId));
  if (filters.websiteBookingRequestId != null) conditions.push(eq(activities.websiteBookingRequestId, filters.websiteBookingRequestId));
  if (filters.generalLeadId != null) conditions.push(eq(activities.generalLeadId, filters.generalLeadId));
  if (filters.type != null) {
    const validTypes = ["email", "whatsapp_message", "online_meeting", "phone_call", "social_message"] as const;
    type ValidType = typeof validTypes[number];
    const t = filters.type;
    const isValidType = (v: string): v is ValidType => (validTypes as readonly string[]).includes(v);
    if (isValidType(t)) {
      conditions.push(eq(activities.type, t));
    }
  }
  if (filters.dateFrom != null) conditions.push(gte(activities.activityDate, filters.dateFrom));
  if (filters.dateTo != null) conditions.push(lte(activities.activityDate, filters.dateTo));
  if (filters.q != null) {
    const pattern = `%${filters.q}%`;
    const orCondition = or(like(activities.subject, pattern), like(activities.notes, pattern));
    if (orCondition != null) conditions.push(orCondition);
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

  // Collect unique IDs for batch lookups instead of full-table scans
  const humanIds = [...new Set(results.map((a) => a.humanId).filter((id): id is string => id != null))];
  const accountIds = [...new Set(results.map((a) => a.accountId).filter((id): id is string => id != null))];
  const colleagueIds = [...new Set(results.map((a) => a.colleagueId).filter((id): id is string => id != null))];

  const [batchHumans, batchAccounts, batchColleagues] = await Promise.all([
    humanIds.length > 0 ? db.select().from(humans).where(inArray(humans.id, humanIds)) : Promise.resolve([]),
    accountIds.length > 0 ? db.select().from(accounts).where(inArray(accounts.id, accountIds)) : Promise.resolve([]),
    colleagueIds.length > 0 ? db.select().from(colleagues).where(inArray(colleagues.id, colleagueIds)) : Promise.resolve([]),
  ]);

  // Build lookup maps
  const humanMap = new Map(batchHumans.map((h) => [h.id, h]));
  const accountMap = new Map(batchAccounts.map((a) => [a.id, a]));
  const colleagueMap = new Map(batchColleagues.map((c) => [c.id, c]));

  // Optionally batch-fetch linked entities
  const geoExprMap = new Map<string, unknown[]>();
  const routeExprMap = new Map<string, unknown[]>();
  const oppMap = new Map<string, unknown[]>();

  if (filters.includeLinkedEntities === true && results.length > 0) {
    const activityIds = results.map((a) => a.id);

    const [geoExprs, routeExprs, linkedOpps] = await Promise.all([
      db.select().from(geoInterestExpressions).where(inArray(geoInterestExpressions.activityId, activityIds)),
      db.select().from(routeInterestExpressions).where(inArray(routeInterestExpressions.activityId, activityIds)),
      db.select({
        id: activityOpportunities.id,
        activityId: activityOpportunities.activityId,
        opportunityId: activityOpportunities.opportunityId,
        displayId: opportunities.displayId,
        stage: opportunities.stage,
        createdAt: activityOpportunities.createdAt,
      }).from(activityOpportunities)
        .innerJoin(opportunities, eq(activityOpportunities.opportunityId, opportunities.id))
        .where(inArray(activityOpportunities.activityId, activityIds)),
    ]);

    // Batch-fetch related geo interests and route interests
    const geoInterestIds = [...new Set(geoExprs.map((e) => e.geoInterestId))];
    const routeInterestIds = [...new Set(routeExprs.map((e) => e.routeInterestId))];

    const [batchGeoInterests, batchRouteInterests] = await Promise.all([
      geoInterestIds.length > 0 ? db.select().from(geoInterests).where(inArray(geoInterests.id, geoInterestIds)) : Promise.resolve([]),
      routeInterestIds.length > 0 ? db.select().from(routeInterests).where(inArray(routeInterests.id, routeInterestIds)) : Promise.resolve([]),
    ]);

    const geoInterestMap = new Map(batchGeoInterests.map((g) => [g.id, g]));
    const routeInterestMap = new Map(batchRouteInterests.map((r) => [r.id, r]));

    // Group expressions by activity ID
    for (const expr of geoExprs) {
      if (expr.activityId == null) continue;
      const gi = geoInterestMap.get(expr.geoInterestId);
      const enriched = { ...expr, city: gi?.city ?? null, country: gi?.country ?? null };
      const list = geoExprMap.get(expr.activityId) ?? [];
      list.push(enriched);
      geoExprMap.set(expr.activityId, list);
    }

    for (const expr of routeExprs) {
      if (expr.activityId == null) continue;
      const ri = routeInterestMap.get(expr.routeInterestId);
      const enriched = { ...expr, originCity: ri?.originCity ?? null, originCountry: ri?.originCountry ?? null, destinationCity: ri?.destinationCity ?? null, destinationCountry: ri?.destinationCountry ?? null };
      const list = routeExprMap.get(expr.activityId) ?? [];
      list.push(enriched);
      routeExprMap.set(expr.activityId, list);
    }

    for (const opp of linkedOpps) {
      const list = oppMap.get(opp.activityId) ?? [];
      list.push(opp);
      oppMap.set(opp.activityId, list);
    }
  }

  const data = results.map((a) => {
    const human = a.humanId != null ? humanMap.get(a.humanId) : null;
    const account = a.accountId != null ? accountMap.get(a.accountId) : null;
    const owner = a.colleagueId != null ? colleagueMap.get(a.colleagueId) : null;
    const base = {
      ...a,
      humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
      humanDisplayId: human?.displayId ?? null,
      accountId: a.accountId,
      accountName: account?.name ?? null,
      ownerId: a.colleagueId,
      ownerName: owner?.name ?? null,
      ownerDisplayId: owner?.displayId ?? null,
    };
    if (filters.includeLinkedEntities === true) {
      return {
        ...base,
        geoInterestExpressions: geoExprMap.get(a.id) ?? [],
        routeInterestExpressions: routeExprMap.get(a.id) ?? [],
        linkedOpportunities: oppMap.get(a.id) ?? [],
      };
    }
    return base;
  });

  return { data, meta: { page, limit, total } };
}

export async function getActivityDetail(db: DB, id: string): Promise<typeof activities.$inferSelect & { humanName: string | null; humanDisplayId: string | null; accountName: string | null; ownerId: string | null; ownerName: string | null; ownerDisplayId: string | null; geoInterestExpressions: unknown[]; routeInterestExpressions: unknown[]; linkedOpportunities: unknown[] }> {
  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  if (activity == null) {
    throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
  }

  // Enrich with human name, account name, and owner info
  const human = activity.humanId != null
    ? await db.query.humans.findFirst({ where: eq(humans.id, activity.humanId) })
    : null;
  const account = activity.accountId != null
    ? await db.query.accounts.findFirst({ where: eq(accounts.id, activity.accountId) })
    : null;
  const owner = activity.colleagueId != null
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

  // Fetch linked opportunities via junction table
  const linkedOpps = await db
    .select({
      id: activityOpportunities.id,
      opportunityId: activityOpportunities.opportunityId,
      displayId: opportunities.displayId,
      stage: opportunities.stage,
      createdAt: activityOpportunities.createdAt,
    })
    .from(activityOpportunities)
    .innerJoin(opportunities, eq(activityOpportunities.opportunityId, opportunities.id))
    .where(eq(activityOpportunities.activityId, id));

  return {
    ...activity,
    humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    ownerId: activity.colleagueId,
    ownerName: owner?.name ?? null,
    ownerDisplayId: owner?.displayId ?? null,
    geoInterestExpressions: geoExpressions,
    routeInterestExpressions: routeExprData,
    linkedOpportunities: linkedOpps,
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
    opportunityId?: string | null;
    gmailId?: string | null;
    frontId?: string | null;
    frontConversationId?: string | null;
    direction?: string | null;
    syncRunId?: string | null;
  },
  colleagueId: string,
): Promise<{ id: string; displayId: string; type: string; subject: string; body: string | null; notes: string | null; activityDate: string; humanId: string | null; accountId: string | null; routeSignupId: string | null; websiteBookingRequestId: string | null; generalLeadId: string | null; opportunityId: string | null; gmailId: string | null; frontId: string | null; frontConversationId: string | null; direction: string | null; syncRunId: string | null; colleagueId: string; createdAt: string; updatedAt: string }> {
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
    opportunityId: data.opportunityId ?? null,
    gmailId: data.gmailId ?? null,
    frontId: data.frontId ?? null,
    frontConversationId: data.frontConversationId ?? null,
    direction: data.direction ?? null,
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
    direction?: string | null;
    syncRunId?: string | null;
    colleagueId?: string | null;
  },
): Promise<typeof activities.$inferSelect | undefined> {
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
  if (data.direction !== undefined) updateFields["direction"] = data.direction;
  if (data.syncRunId !== undefined) updateFields["syncRunId"] = data.syncRunId;
  if (data.colleagueId !== undefined) updateFields["colleagueId"] = data.colleagueId;

  await db.update(activities).set(updateFields).where(eq(activities.id, id));

  const updated = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  return updated;
}

export async function linkActivityOpportunity(db: DB, activityId: string, opportunityId: string): Promise<{ id: string; activityId: string; opportunityId: string; createdAt: string } | undefined> {
  // Check for duplicate
  const existing = await db
    .select()
    .from(activityOpportunities)
    .where(and(eq(activityOpportunities.activityId, activityId), eq(activityOpportunities.opportunityId, opportunityId)));
  if (existing.length > 0) return existing[0];

  const link = {
    id: createId(),
    activityId,
    opportunityId,
    createdAt: new Date().toISOString(),
  };
  await db.insert(activityOpportunities).values(link);
  return link;
}

export async function unlinkActivityOpportunity(db: DB, linkId: string): Promise<void> {
  await db.delete(activityOpportunities).where(eq(activityOpportunities.id, linkId));
}

export async function deleteActivity(db: DB, id: string): Promise<void> {
  const existing = await db.query.activities.findFirst({
    where: eq(activities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
  }

  // Remove activity-opportunity links
  await db.delete(activityOpportunities).where(eq(activityOpportunities.activityId, id));

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
