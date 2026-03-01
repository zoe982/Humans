import { eq, ilike, or, and, inArray } from "drizzle-orm";
import {
  geoInterests,
  geoInterestExpressions,
  humans,
  activities,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

// ---------------------------------------------------------------------------
// Geo-interests
// ---------------------------------------------------------------------------

export async function listGeoInterests(db: DB): Promise<{ humanCount: number; expressionCount: number; id: string; displayId: string; city: string; country: string; createdAt: string }[]> {
  const allGeoInterests = await db.select().from(geoInterests);
  const allExpressions = await db.select().from(geoInterestExpressions);

  return allGeoInterests.map((gi) => {
    const expressions = allExpressions.filter((e) => e.geoInterestId === gi.id);
    const uniqueHumanIds = new Set(expressions.map((e) => e.humanId));
    return {
      ...gi,
      humanCount: uniqueHumanIds.size,
      expressionCount: expressions.length,
    };
  });
}

export async function searchGeoInterests(db: DB, query: string): Promise<(typeof geoInterests.$inferSelect)[]> {
  if (query === "" || query.trim().length === 0) {
    return [];
  }

  const pattern = `%${query}%`;
  return db
    .select()
    .from(geoInterests)
    .where(or(ilike(geoInterests.city, pattern), ilike(geoInterests.country, pattern)));
}

export async function getGeoInterestDetail(db: DB, id: string): Promise<{ expressions: { humanName: string | null; activitySubject: string | null; id: string; displayId: string; humanId: string; geoInterestId: string; activityId: string | null; notes: string | null; createdAt: string }[]; id: string; displayId: string; city: string; country: string; createdAt: string }> {
  const geoInterest = await db.query.geoInterests.findFirst({
    where: eq(geoInterests.id, id),
  });
  if (geoInterest == null) {
    throw notFound(ERROR_CODES.GEO_INTEREST_NOT_FOUND, "Geo-interest not found");
  }

  const expressions = await db
    .select()
    .from(geoInterestExpressions)
    .where(eq(geoInterestExpressions.geoInterestId, id));

  const humanIds = expressions.map((e) => e.humanId);
  const activityIds = expressions.map((e) => e.activityId).filter((id): id is string => id != null);

  const allHumans = humanIds.length > 0
    ? await db.select().from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allActivities = activityIds.length > 0
    ? await db.select().from(activities).where(inArray(activities.id, activityIds))
    : [];

  const expressionsWithDetails = expressions.map((expr) => {
    const human = allHumans.find((h) => h.id === expr.humanId);
    const activity = expr.activityId != null ? allActivities.find((a) => a.id === expr.activityId) : null;
    return {
      ...expr,
      humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
      activitySubject: activity?.subject ?? null,
    };
  });

  return {
    ...geoInterest,
    expressions: expressionsWithDetails,
  };
}

export async function createGeoInterest(
  db: DB,
  data: { city: string; country: string },
): Promise<{ data: typeof geoInterests.$inferSelect; created: boolean }> {
  const existing = await db.query.geoInterests.findFirst({
    where: and(eq(geoInterests.city, data.city), eq(geoInterests.country, data.country)),
  });

  if (existing != null) {
    return { data: existing, created: false };
  }

  const displayId = await nextDisplayId(db, "GEO");

  const gi = {
    id: createId(),
    displayId,
    city: data.city,
    country: data.country,
    createdAt: new Date().toISOString(),
  };

  await db.insert(geoInterests).values(gi);
  return { data: gi, created: true };
}

export async function deleteGeoInterest(db: DB, id: string): Promise<void> {
  const existing = await db.query.geoInterests.findFirst({
    where: eq(geoInterests.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GEO_INTEREST_NOT_FOUND, "Geo-interest not found");
  }

  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.geoInterestId, id));
  await db.delete(geoInterests).where(eq(geoInterests.id, id));
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export async function listExpressions(
  db: DB,
  filters: { humanId?: string | undefined; geoInterestId?: string | undefined; activityId?: string | undefined },
): Promise<{ humanName: string | null; city: string | null; country: string | null; activitySubject: string | null; id: string; displayId: string; humanId: string; geoInterestId: string; activityId: string | null; notes: string | null; createdAt: string }[]> {
  const conditions = [];
  if (filters.humanId != null) conditions.push(eq(geoInterestExpressions.humanId, filters.humanId));
  if (filters.geoInterestId != null) conditions.push(eq(geoInterestExpressions.geoInterestId, filters.geoInterestId));
  if (filters.activityId != null) conditions.push(eq(geoInterestExpressions.activityId, filters.activityId));

  let expressions;
  if (conditions.length > 0) {
    expressions = await db
      .select()
      .from(geoInterestExpressions)
      .where(and(...conditions));
  } else {
    expressions = await db.select().from(geoInterestExpressions);
  }

  const humanIds = [...new Set(expressions.map((e) => e.humanId))];
  const geoInterestIds = [...new Set(expressions.map((e) => e.geoInterestId))];
  const activityIds = expressions.map((e) => e.activityId).filter((id): id is string => id != null);

  const allHumans = humanIds.length > 0
    ? await db.select().from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allGeoInterests = geoInterestIds.length > 0
    ? await db.select().from(geoInterests).where(inArray(geoInterests.id, geoInterestIds))
    : [];
  const allActivities = activityIds.length > 0
    ? await db.select().from(activities).where(inArray(activities.id, activityIds))
    : [];

  return expressions.map((expr) => {
    const human = allHumans.find((h) => h.id === expr.humanId);
    const gi = allGeoInterests.find((g) => g.id === expr.geoInterestId);
    const activity = expr.activityId != null ? allActivities.find((a) => a.id === expr.activityId) : null;
    return {
      ...expr,
      humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
      city: gi?.city ?? null,
      country: gi?.country ?? null,
      activitySubject: activity?.subject ?? null,
    };
  });
}

export async function createExpression(
  db: DB,
  data: {
    humanId: string;
    geoInterestId?: string | null | undefined;
    city?: string | null | undefined;
    country?: string | null | undefined;
    activityId?: string | null | undefined;
    notes?: string | null | undefined;
  },
): Promise<{ id: string; displayId: string; humanId: string; geoInterestId: string; activityId: string | null; notes: string | null; createdAt: string }> {
  const now = new Date().toISOString();

  // Verify human exists
  const human = await db.query.humans.findFirst({
    where: eq(humans.id, data.humanId),
  });
  if (human == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  // Resolve geo-interest
  let geoInterestId = data.geoInterestId;
  if (geoInterestId == null && data.city != null && data.country != null) {
    const existing = await db.query.geoInterests.findFirst({
      where: and(eq(geoInterests.city, data.city), eq(geoInterests.country, data.country)),
    });
    if (existing != null) {
      geoInterestId = existing.id;
    } else {
      const geoDisplayId = await nextDisplayId(db, "GEO");
      geoInterestId = createId();
      await db.insert(geoInterests).values({
        id: geoInterestId,
        displayId: geoDisplayId,
        city: data.city,
        country: data.country,
        createdAt: now,
      });
    }
  }

  // Verify activity if provided
  if (data.activityId != null) {
    const activity = await db.query.activities.findFirst({
      where: eq(activities.id, data.activityId),
    });
    if (activity == null) {
      throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
    }
  }

  const displayId = await nextDisplayId(db, "GEX");

  if (geoInterestId == null) {
    throw notFound(ERROR_CODES.GEO_INTEREST_NOT_FOUND, "Geo-interest could not be resolved");
  }

  const expression = {
    id: createId(),
    displayId,
    humanId: data.humanId,
    geoInterestId,
    activityId: data.activityId ?? null,
    notes: data.notes ?? null,
    createdAt: now,
  };

  await db.insert(geoInterestExpressions).values(expression);
  return expression;
}

export async function getGeoInterestExpressionDetail(db: DB, id: string): Promise<{ humanName: string | null; humanDisplayId: string | null; city: string | null; country: string | null; geoDisplayId: string | null; activitySubject: string | null; id: string; displayId: string; humanId: string; geoInterestId: string; activityId: string | null; notes: string | null; createdAt: string }> {
  const expr = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  if (expr == null) {
    throw notFound(ERROR_CODES.GEO_EXPRESSION_NOT_FOUND, "Geo-interest expression not found");
  }

  const [gi, human, activity] = await Promise.all([
    db.query.geoInterests.findFirst({ where: eq(geoInterests.id, expr.geoInterestId) }),
    db.query.humans.findFirst({ where: eq(humans.id, expr.humanId) }),
    expr.activityId != null ? db.query.activities.findFirst({ where: eq(activities.id, expr.activityId) }) : null,
  ]);

  return {
    ...expr,
    humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    city: gi?.city ?? null,
    country: gi?.country ?? null,
    geoDisplayId: gi?.displayId ?? null,
    activitySubject: activity?.subject ?? null,
  };
}

export async function updateExpression(
  db: DB,
  id: string,
  data: { notes?: string | null },
): Promise<typeof geoInterestExpressions.$inferSelect | undefined> {
  const existing = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GEO_EXPRESSION_NOT_FOUND, "Expression not found");
  }

  await db
    .update(geoInterestExpressions)
    .set({ notes: data.notes })
    .where(eq(geoInterestExpressions.id, id));

  const updated = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  return updated;
}

export async function deleteExpression(db: DB, id: string): Promise<void> {
  const existing = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GEO_EXPRESSION_NOT_FOUND, "Expression not found");
  }

  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.id, id));
}
