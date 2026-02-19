import { Hono } from "hono";
import { eq, like, or, and } from "drizzle-orm";
import { geoInterests, geoInterestExpressions, humans, activities } from "@humans/db/schema";
import { createId } from "@humans/db";
import {
  createGeoInterestSchema,
  createGeoInterestExpressionSchema,
  updateGeoInterestExpressionSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const geoInterestRoutes = new Hono<AppContext>();

geoInterestRoutes.use("/*", authMiddleware);

// List all geo-interests with counts
geoInterestRoutes.get("/api/geo-interests", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allGeoInterests = await db.select().from(geoInterests);
  const allExpressions = await db.select().from(geoInterestExpressions);

  const data = allGeoInterests.map((gi) => {
    const expressions = allExpressions.filter((e) => e.geoInterestId === gi.id);
    const uniqueHumanIds = new Set(expressions.map((e) => e.humanId));
    return {
      ...gi,
      humanCount: uniqueHumanIds.size,
      expressionCount: expressions.length,
    };
  });

  return c.json({ data });
});

// Search geo-interests by city/country
geoInterestRoutes.get("/api/geo-interests/search", requirePermission("viewRecords"), async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ data: [] });
  }

  const db = c.get("db");
  const pattern = `%${q}%`;
  const results = await db
    .select()
    .from(geoInterests)
    .where(or(like(geoInterests.city, pattern), like(geoInterests.country, pattern)));

  return c.json({ data: results });
});

// Get single geo-interest with expressions and human names
geoInterestRoutes.get("/api/geo-interests/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const geoInterest = await db.query.geoInterests.findFirst({
    where: eq(geoInterests.id, id),
  });
  if (geoInterest == null) {
    return c.json({ error: "Geo-interest not found" }, 404);
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

  return c.json({
    data: {
      ...geoInterest,
      expressions: expressionsWithDetails,
    },
  });
});

// Create geo-interest (idempotent on city+country)
geoInterestRoutes.post("/api/geo-interests", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createGeoInterestSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.geoInterests.findFirst({
    where: and(eq(geoInterests.city, data.city), eq(geoInterests.country, data.country)),
  });

  if (existing) {
    return c.json({ data: existing });
  }

  const gi = {
    id: createId(),
    city: data.city,
    country: data.country,
    createdAt: new Date().toISOString(),
  };

  await db.insert(geoInterests).values(gi);
  return c.json({ data: gi }, 201);
});

// Delete geo-interest + cascade expressions
geoInterestRoutes.delete("/api/geo-interests/:id", requirePermission("manageHumans"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.geoInterests.findFirst({
    where: eq(geoInterests.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Geo-interest not found" }, 404);
  }

  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.geoInterestId, id));
  await db.delete(geoInterests).where(eq(geoInterests.id, id));

  return c.json({ success: true });
});

// List expressions, filterable by humanId and geoInterestId
geoInterestRoutes.get("/api/geo-interest-expressions", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const humanId = c.req.query("humanId");
  const geoInterestId = c.req.query("geoInterestId");

  let expressions;
  if (humanId && geoInterestId) {
    expressions = await db
      .select()
      .from(geoInterestExpressions)
      .where(
        and(
          eq(geoInterestExpressions.humanId, humanId),
          eq(geoInterestExpressions.geoInterestId, geoInterestId),
        ),
      );
  } else if (humanId) {
    expressions = await db
      .select()
      .from(geoInterestExpressions)
      .where(eq(geoInterestExpressions.humanId, humanId));
  } else if (geoInterestId) {
    expressions = await db
      .select()
      .from(geoInterestExpressions)
      .where(eq(geoInterestExpressions.geoInterestId, geoInterestId));
  } else {
    expressions = await db.select().from(geoInterestExpressions);
  }

  // Enrich with human name and geo-interest city/country
  const allHumans = await db.select().from(humans);
  const allGeoInterests = await db.select().from(geoInterests);
  const allActivities = await db.select().from(activities);

  const data = expressions.map((expr) => {
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

  return c.json({ data });
});

// Create expression (resolve geo-interest by city+country or use geoInterestId)
geoInterestRoutes.post("/api/geo-interest-expressions", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createGeoInterestExpressionSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  // Verify human exists
  const human = await db.query.humans.findFirst({
    where: eq(humans.id, data.humanId),
  });
  if (human == null) {
    return c.json({ error: "Human not found" }, 404);
  }

  // Resolve geo-interest
  let geoInterestId = data.geoInterestId;
  if (!geoInterestId && data.city && data.country) {
    // Find or create
    const existing = await db.query.geoInterests.findFirst({
      where: and(eq(geoInterests.city, data.city), eq(geoInterests.country, data.country)),
    });
    if (existing) {
      geoInterestId = existing.id;
    } else {
      geoInterestId = createId();
      await db.insert(geoInterests).values({
        id: geoInterestId,
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
      return c.json({ error: "Activity not found" }, 404);
    }
  }

  const expression = {
    id: createId(),
    humanId: data.humanId,
    geoInterestId: geoInterestId!,
    activityId: data.activityId ?? null,
    notes: data.notes ?? null,
    createdAt: now,
  };

  await db.insert(geoInterestExpressions).values(expression);
  return c.json({ data: expression }, 201);
});

// Update expression (notes only)
geoInterestRoutes.patch("/api/geo-interest-expressions/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateGeoInterestExpressionSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Expression not found" }, 404);
  }

  await db
    .update(geoInterestExpressions)
    .set({ notes: data.notes })
    .where(eq(geoInterestExpressions.id, id));

  const updated = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  return c.json({ data: updated });
});

// Delete expression
geoInterestRoutes.delete("/api/geo-interest-expressions/:id", requirePermission("manageHumans"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.geoInterestExpressions.findFirst({
    where: eq(geoInterestExpressions.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Expression not found" }, 404);
  }

  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.id, id));
  return c.json({ success: true });
});

export { geoInterestRoutes };
