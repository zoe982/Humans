import { Hono } from "hono";
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
    type: c.req.query("type"),
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    page,
    limit,
  });
  return c.json(result);
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
  const data = updateActivitySchema.parse(body);
  const result = await updateActivity(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete activity
activityRoutes.delete("/api/activities/:id", requirePermission("createEditRecords"), async (c) => {
  await deleteActivity(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { activityRoutes };
