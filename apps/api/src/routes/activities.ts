import { Hono } from "hono";
import { eq, and, gte, lte } from "drizzle-orm";
import { activities, humans } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createActivitySchema, updateActivitySchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const activityRoutes = new Hono<AppContext>();

activityRoutes.use("/*", authMiddleware);

// List activities with optional filters
activityRoutes.get("/api/activities", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const humanId = c.req.query("humanId");
  const routeSignupId = c.req.query("routeSignupId");
  const type = c.req.query("type");
  const dateFrom = c.req.query("dateFrom");
  const dateTo = c.req.query("dateTo");

  const conditions = [];
  if (humanId) conditions.push(eq(activities.humanId, humanId));
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

  // Attach human names for the dedicated activities page
  const allHumans = await db.select().from(humans);
  const data = results.map((a) => {
    const human = a.humanId ? allHumans.find((h) => h.id === a.humanId) : null;
    return {
      ...a,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
    };
  });

  return c.json({ data });
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
    subject: data.subject,
    body: data.notes ?? null,
    notes: data.notes ?? null,
    activityDate: data.activityDate,
    humanId: data.humanId ?? null,
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
    return c.json({ error: "Activity not found" }, 404);
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
    return c.json({ error: "Activity not found" }, 404);
  }

  await db.delete(activities).where(eq(activities.id, id));
  return c.json({ success: true });
});

export { activityRoutes };
