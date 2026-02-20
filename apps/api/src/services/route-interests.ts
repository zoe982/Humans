import { eq, like, or, and } from "drizzle-orm";
import {
  routeInterests,
  routeInterestExpressions,
  geoInterests,
  humans,
  activities,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

// ---------------------------------------------------------------------------
// Route interests
// ---------------------------------------------------------------------------

export async function listRouteInterests(db: DB) {
  const allRouteInterests = await db.select().from(routeInterests);
  const allExpressions = await db.select().from(routeInterestExpressions);

  return allRouteInterests.map((ri) => {
    const expressions = allExpressions.filter((e) => e.routeInterestId === ri.id);
    const uniqueHumanIds = new Set(expressions.map((e) => e.humanId));
    return {
      ...ri,
      humanCount: uniqueHumanIds.size,
      expressionCount: expressions.length,
    };
  });
}

export async function getRouteInterestDetail(db: DB, id: string) {
  const routeInterest = await db.query.routeInterests.findFirst({
    where: eq(routeInterests.id, id),
  });
  if (routeInterest == null) {
    throw notFound(ERROR_CODES.ROUTE_INTEREST_NOT_FOUND, "Route interest not found");
  }

  const expressions = await db
    .select()
    .from(routeInterestExpressions)
    .where(eq(routeInterestExpressions.routeInterestId, id));

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
    ...routeInterest,
    expressions: expressionsWithDetails,
  };
}

export async function createRouteInterest(
  db: DB,
  data: { originCity: string; originCountry: string; destinationCity: string; destinationCountry: string },
) {
  const existing = await db.query.routeInterests.findFirst({
    where: and(
      eq(routeInterests.originCity, data.originCity),
      eq(routeInterests.originCountry, data.originCountry),
      eq(routeInterests.destinationCity, data.destinationCity),
      eq(routeInterests.destinationCountry, data.destinationCountry),
    ),
  });

  if (existing) {
    return { data: existing, created: false };
  }

  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "ROI");

  const ri = {
    id: createId(),
    displayId,
    originCity: data.originCity,
    originCountry: data.originCountry,
    destinationCity: data.destinationCity,
    destinationCountry: data.destinationCountry,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(routeInterests).values(ri);
  return { data: ri, created: true };
}

export async function deleteRouteInterest(db: DB, id: string) {
  const existing = await db.query.routeInterests.findFirst({
    where: eq(routeInterests.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ROUTE_INTEREST_NOT_FOUND, "Route interest not found");
  }

  await db.delete(routeInterestExpressions).where(eq(routeInterestExpressions.routeInterestId, id));
  await db.delete(routeInterests).where(eq(routeInterests.id, id));
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

export async function listRouteInterestExpressions(
  db: DB,
  filters: { humanId?: string; routeInterestId?: string; activityId?: string },
) {
  const conditions = [];
  if (filters.humanId) conditions.push(eq(routeInterestExpressions.humanId, filters.humanId));
  if (filters.routeInterestId) conditions.push(eq(routeInterestExpressions.routeInterestId, filters.routeInterestId));
  if (filters.activityId) conditions.push(eq(routeInterestExpressions.activityId, filters.activityId));

  let expressions;
  if (conditions.length > 0) {
    expressions = await db
      .select()
      .from(routeInterestExpressions)
      .where(and(...conditions));
  } else {
    expressions = await db.select().from(routeInterestExpressions);
  }

  const allHumans = await db.select().from(humans);
  const allRouteInterests = await db.select().from(routeInterests);
  const allActivities = await db.select().from(activities);

  return expressions.map((expr) => {
    const human = allHumans.find((h) => h.id === expr.humanId);
    const ri = allRouteInterests.find((r) => r.id === expr.routeInterestId);
    const activity = expr.activityId ? allActivities.find((a) => a.id === expr.activityId) : null;
    return {
      ...expr,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      originCity: ri?.originCity ?? null,
      originCountry: ri?.originCountry ?? null,
      destinationCity: ri?.destinationCity ?? null,
      destinationCountry: ri?.destinationCountry ?? null,
      activitySubject: activity?.subject ?? null,
    };
  });
}

export async function createRouteInterestExpression(
  db: DB,
  data: {
    humanId: string;
    routeInterestId?: string | null;
    originCity?: string | null;
    originCountry?: string | null;
    destinationCity?: string | null;
    destinationCountry?: string | null;
    activityId?: string | null;
    frequency?: string;
    travelYear?: number | null;
    travelMonth?: number | null;
    travelDay?: number | null;
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

  // Resolve route interest
  let routeInterestId = data.routeInterestId;
  if (!routeInterestId && data.originCity && data.originCountry && data.destinationCity && data.destinationCountry) {
    const existing = await db.query.routeInterests.findFirst({
      where: and(
        eq(routeInterests.originCity, data.originCity),
        eq(routeInterests.originCountry, data.originCountry),
        eq(routeInterests.destinationCity, data.destinationCity),
        eq(routeInterests.destinationCountry, data.destinationCountry),
      ),
    });
    if (existing) {
      routeInterestId = existing.id;
    } else {
      const riDisplayId = await nextDisplayId(db, "ROI");
      routeInterestId = createId();
      await db.insert(routeInterests).values({
        id: routeInterestId,
        displayId: riDisplayId,
        originCity: data.originCity,
        originCountry: data.originCountry,
        destinationCity: data.destinationCity,
        destinationCountry: data.destinationCountry,
        createdAt: now,
        updatedAt: now,
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

  const displayId = await nextDisplayId(db, "REX");

  const expression = {
    id: createId(),
    displayId,
    humanId: data.humanId,
    routeInterestId: routeInterestId!,
    activityId: data.activityId ?? null,
    frequency: data.frequency ?? "one_time",
    travelYear: data.travelYear ?? null,
    travelMonth: data.travelMonth ?? null,
    travelDay: data.travelDay ?? null,
    notes: data.notes ?? null,
    createdAt: now,
  };

  await db.insert(routeInterestExpressions).values(expression);
  return expression;
}

export async function getRouteInterestExpressionDetail(db: DB, id: string) {
  const expr = await db.query.routeInterestExpressions.findFirst({
    where: eq(routeInterestExpressions.id, id),
  });
  if (expr == null) {
    throw notFound(ERROR_CODES.ROUTE_EXPRESSION_NOT_FOUND, "Route interest expression not found");
  }

  const [ri, human, activity] = await Promise.all([
    db.query.routeInterests.findFirst({ where: eq(routeInterests.id, expr.routeInterestId) }),
    db.query.humans.findFirst({ where: eq(humans.id, expr.humanId) }),
    expr.activityId ? db.query.activities.findFirst({ where: eq(activities.id, expr.activityId) }) : null,
  ]);

  return {
    ...expr,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    originCity: ri?.originCity ?? null,
    originCountry: ri?.originCountry ?? null,
    destinationCity: ri?.destinationCity ?? null,
    destinationCountry: ri?.destinationCountry ?? null,
    routeDisplayId: ri?.displayId ?? null,
    activitySubject: activity?.subject ?? null,
  };
}

export async function updateRouteInterestExpression(
  db: DB,
  id: string,
  data: {
    frequency?: string;
    travelYear?: number | null;
    travelMonth?: number | null;
    travelDay?: number | null;
    notes?: string | null;
    activityId?: string | null;
  },
) {
  const existing = await db.query.routeInterestExpressions.findFirst({
    where: eq(routeInterestExpressions.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ROUTE_EXPRESSION_NOT_FOUND, "Route interest expression not found");
  }

  const updateFields: Record<string, unknown> = {};
  if (data.frequency !== undefined) updateFields["frequency"] = data.frequency;
  if (data.travelYear !== undefined) updateFields["travelYear"] = data.travelYear;
  if (data.travelMonth !== undefined) updateFields["travelMonth"] = data.travelMonth;
  if (data.travelDay !== undefined) updateFields["travelDay"] = data.travelDay;
  if (data.notes !== undefined) updateFields["notes"] = data.notes;
  if (data.activityId !== undefined) updateFields["activityId"] = data.activityId;

  await db
    .update(routeInterestExpressions)
    .set(updateFields)
    .where(eq(routeInterestExpressions.id, id));

  const updated = await db.query.routeInterestExpressions.findFirst({
    where: eq(routeInterestExpressions.id, id),
  });
  return updated;
}

export async function deleteRouteInterestExpression(db: DB, id: string) {
  const existing = await db.query.routeInterestExpressions.findFirst({
    where: eq(routeInterestExpressions.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ROUTE_EXPRESSION_NOT_FOUND, "Route interest expression not found");
  }

  await db.delete(routeInterestExpressions).where(eq(routeInterestExpressions.id, id));
}

// ---------------------------------------------------------------------------
// City autocomplete
// ---------------------------------------------------------------------------

export async function listCities(db: DB, query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const pattern = `%${query}%`;

  // Get cities from route_interests (both origin and destination)
  const allRouteInterestRows = await db
    .select({
      originCity: routeInterests.originCity,
      originCountry: routeInterests.originCountry,
      destinationCity: routeInterests.destinationCity,
      destinationCountry: routeInterests.destinationCountry,
    })
    .from(routeInterests)
    .where(
      or(
        like(routeInterests.originCity, pattern),
        like(routeInterests.destinationCity, pattern),
      ),
    );

  // Get cities from geo_interests
  const geoRows = await db
    .select({ city: geoInterests.city, country: geoInterests.country })
    .from(geoInterests)
    .where(like(geoInterests.city, pattern));

  // Deduplicate by city+country
  const cityMap = new Map<string, { city: string; country: string }>();

  for (const row of allRouteInterestRows) {
    if (row.originCity.toLowerCase().includes(query.toLowerCase())) {
      const key = `${row.originCity}|${row.originCountry}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, { city: row.originCity, country: row.originCountry });
      }
    }
    if (row.destinationCity.toLowerCase().includes(query.toLowerCase())) {
      const key = `${row.destinationCity}|${row.destinationCountry}`;
      if (!cityMap.has(key)) {
        cityMap.set(key, { city: row.destinationCity, country: row.destinationCountry });
      }
    }
  }

  for (const row of geoRows) {
    const key = `${row.city}|${row.country}`;
    if (!cityMap.has(key)) {
      cityMap.set(key, { city: row.city, country: row.country });
    }
  }

  const results = Array.from(cityMap.values());
  results.sort((a, b) => a.city.localeCompare(b.city));
  return results;
}
