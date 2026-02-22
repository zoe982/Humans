import { Hono } from "hono";
import { sql, gte } from "drizzle-orm";
import { activities } from "@humans/db/schema";
import { createActivitySchema, updateActivitySchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listActivities,
  getActivityDetail,
  createActivity,
  updateActivity,
  deleteActivity,
} from "../services/activities";
import type { AppContext } from "../types";

const activityRoutes = new Hono<AppContext>();

activityRoutes.use("/*", authMiddleware);

// List activities with optional filters (paginated)
activityRoutes.get("/api/activities", requirePermission("viewRecords"), async (c) => {
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 25));

  const result = await listActivities(c.get("db"), {
    humanId: c.req.query("humanId"),
    accountId: c.req.query("accountId"),
    routeSignupId: c.req.query("routeSignupId"),
    websiteBookingRequestId: c.req.query("websiteBookingRequestId"),
    generalLeadId: c.req.query("generalLeadId"),
    type: c.req.query("type"),
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    q: c.req.query("q"),
    page,
    limit,
  });
  return c.json(result);
});

// Daily activity counts for the past N days (default 30, max 90)
activityRoutes.get("/api/activities/daily-counts", requirePermission("viewRecords"), async (c) => {
  const rawDays = Number(c.req.query("days")) || 30;
  const days = Math.min(90, Math.max(1, rawDays));

  // Calculate the start date (inclusive) as an ISO date string
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceDate = since.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const db = c.get("db");

  // Query counts grouped by date for the window
  const rows = await db
    .select({
      date: sql<string>`DATE(${activities.activityDate})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(activities)
    .where(gte(activities.activityDate, sinceDate))
    .groupBy(sql`DATE(${activities.activityDate})`)
    .orderBy(sql`DATE(${activities.activityDate})`);

  // Build a lookup from the query results
  const countByDate = new Map<string, number>(
    rows.map((r) => [r.date, Number(r.count)]),
  );

  // Fill every day in the window with 0 if no row returned for that date
  const data: { date: string; count: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().slice(0, 10);
    data.push({ date: dateStr, count: countByDate.get(dateStr) ?? 0 });
  }

  return c.json({ data });
});

// Get single activity with enriched data
activityRoutes.get("/api/activities/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getActivityDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create activity
activityRoutes.post("/api/activities", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createActivitySchema.parse(body);
  const session = c.get("session")!;
  const result = await createActivity(c.get("db"), data, session.colleagueId);
  return c.json({ data: result }, 201);
});

// Update activity
activityRoutes.patch("/api/activities/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const { ownerId, ...rest } = updateActivitySchema.parse(body);
  const serviceData = { ...rest, ...(ownerId !== undefined ? { colleagueId: ownerId } : {}) };
  const result = await updateActivity(c.get("db"), c.req.param("id"), serviceData);
  return c.json({ data: result });
});

// Delete activity
activityRoutes.delete("/api/activities/:id", requirePermission("createEditRecords"), async (c) => {
  await deleteActivity(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { activityRoutes };
