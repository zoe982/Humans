import { Hono } from "hono";
import { eq, and, gte, lte } from "drizzle-orm";
import { activities, humans, accounts, geoInterestExpressions, geoInterests } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createActivitySchema, updateActivitySchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound } from "../lib/errors";
import type { AppContext } from "../types";

const activityRoutes = new Hono<AppContext>();

activityRoutes.use("/*", authMiddleware);

// List activities with optional filters
activityRoutes.get("/api/activities", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const humanId = c.req.query("humanId");
  const accountId = c.req.query("accountId");
  const routeSignupId = c.req.query("routeSignupId");
  const type = c.req.query("type");
  const dateFrom = c.req.query("dateFrom");
  const dateTo = c.req.query("dateTo");

  const conditions = [];
  if (humanId) conditions.push(eq(activities.humanId, humanId));
  if (accountId) conditions.push(eq(activities.accountId, accountId));
  if (routeSignupId) conditions.push(eq(activities.routeSignupId, routeSignupId));
  if (type) conditions.push(eq(activities.type, type as typeof activities.type.enumValues[number]));
  if (dateFrom) conditions.push(gte(activities.activityDate, dateFrom));
  if (dateTo) conditions.push(lte(activities.activityDate, dateTo));

  let results;
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(activities)
      .where(and(...conditions));
  } else {
    results = await db.select().from(activities);
  }

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

  return c.json({ data });
});

// Get single activity with enriched data
activityRoutes.get("/api/activities/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

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

  return c.json({
    data: {
      ...activity,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      accountName: account?.name ?? null,
      geoInterestExpressions: geoExpressions,
    },
  });
});

// Create activity
activityRoutes.post("/api/activities", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createActivitySchema.parse(body);
  const db = c.get("db");
  const session = c.get("session")!;
  const now = new Date().toISOString();

  const activity = {
    id: createId(),
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
    createdByColleagueId: session.colleagueId,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(activities).values(activity);
  return c.json({ data: activity }, 201);
});

// Update activity
activityRoutes.patch("/api/activities/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateActivitySchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");

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
  return c.json({ data: updated });
});

// Delete activity
activityRoutes.delete("/api/activities/:id", requirePermission("createEditRecords"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

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
  return c.json({ success: true });
});

export { activityRoutes };
