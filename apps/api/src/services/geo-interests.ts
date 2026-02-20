import { eq, like, or, and } from "drizzle-orm";
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

export async function listGeoInterests(db: DB) {
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

export async function searchGeoInterests(db: DB, query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const pattern = `%${query}%`;
  return db
    .select()
    .from(geoInterests)
    .where(or(like(geoInterests.city, pattern), like(geoInterests.country, pattern)));
}

export async function getGeoInterestDetail(db: DB, id: string) {
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

  const allHumans = await db.select().from(humans);
  const allActivities = await db.select().from(activities);

  const expressionsWithDetails = expressions.map((expr) => {
    const human = allHumans.find((h) => h.id === expr.humanId);
    const activity = expr.activityId ? allActivities.find((a) => a.id === expr.activityId) : null;
    return {
      ...expr,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
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
) {
  const existing = await db.query.geoInterests.findFirst({
    where: and(eq(geoInterests.city, data.city), eq(geoInterests.country, data.country)),
  });

  if (existing) {
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

export async function deleteGeoInterest(db: DB, id: string) {
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
  filters: { humanId?: string; geoInterestId?: string; activityId?: string },
) {
  const conditions = [];
  if (filters.humanId) conditions.push(eq(geoInterestExpressions.humanId, filters.humanId));
  if (filters.geoInterestId) conditions.push(eq(geoInterestExpressions.geoInterestId, filters.geoInterestId));
  if (filters.activityId) conditions.push(eq(geoInterestExpressions.activityId, filters.activityId));

  let expressions;
  if (conditions.length > 0) {
    expressions = await db
      .select()
      .from(geoInterestExpressions)
      .where(and(...conditions));
  } else {
    expressions = await db.select().from(geoInterestExpressions);
  }

  const allHumans = await db.select().from(humans);
  const allGeoInterests = await db.select().from(geoInterests);
  const allActivities = await db.select().from(activities);

  return expressions.map((expr) => {
    const human = allHumans.find((h) => h.id === expr.humanId);
    const gi = allGeoInterests.find((g) => g.id === expr.geoInterestId);
    const activity = expr.activityId ? allActivities.find((a) => a.id === expr.activityId) : null;
    return {
      ...expr,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
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
    geoInterestId?: string | null;
    city?: string | null;
    country?: string | null;
    activityId?: string | null;
    notes?: string | null;
  },
) {
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
  if (!geoInterestId && data.city && data.country) {
    const existing = await db.query.geoInterests.findFirst({
      where: and(eq(geoInterests.city, data.city), eq(geoInterests.country, data.country)),
    });
    if (existing) {
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
  if (data.activityId) {
    const activity = await db.query.activities.findFirst({
      where: eq(activities.id, data.activityId),
    });
    if (activity == null) {
      throw notFound(ERROR_CODES.ACTIVITY_NOT_FOUND, "Activity not found");
    }
  }

  const displayId = await nextDisplayId(db, "GEX");

  const expression = {
    id: createId(),
    displayId,
    humanId: data.humanId,
    geoInterestId: geoInterestId!,
    activityId: data.activityId ?? null,
    notes: data.notes ?? null,
    createdAt: now,
  };

  await db.insert(geoInterestExpressions).values(expression);
  return expression;
}

export async function updateExpression(
  db: DB,
  id: string,
  data: { notes?: string | null },
) {
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

export async function deleteExpression(db: DB, id: string) {
  const existing = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.GEO_EXPRESSION_NOT_FOUND, "Expression not found");
  }

  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.id, id));
}
