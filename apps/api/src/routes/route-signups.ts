import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sql, inArray } from "drizzle-orm";
import { activities } from "@humans/db/schema";
import { updateRouteSignupSchema, updateEntityNextActionSchema, createEmailSchema, createPhoneNumberSchema, createSocialIdSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal, notFound, badRequest } from "../lib/errors";
import { sanitizePostgrestValue } from "../lib/supabase-sanitize";
import { nextDisplayId } from "../lib/display-id";
import { getNextAction, updateNextAction, completeNextAction } from "../services/entity-next-actions";
import { createEmail, deleteEmail, listEmailsForEntity } from "../services/emails";
import { createPhoneNumber, deletePhoneNumber, listPhoneNumbersForEntity } from "../services/phone-numbers";
import { createSocialId, deleteSocialId, listSocialIdsForEntity } from "../services/social-ids";
import type { AppContext } from "../types";
import type { DB } from "../services/types";

const routeSignupRoutes = new Hono<AppContext>();

routeSignupRoutes.use("/*", authMiddleware);
routeSignupRoutes.use("/*", supabaseMiddleware);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Auto-assign crm_display_id to route signups that don't have one yet.
 * Writes back to Supabase and mutates the row objects in place.
 */
async function ensureDisplayIds(
  supabase: SupabaseClient,
  db: DB,
  rows: unknown[],
): Promise<void> {
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (row["display_id"] == null) {
      const displayId = await nextDisplayId(db, "ROU");
      const { error } = await supabase
        .from("announcement_signups")
        .update({ display_id: displayId })
        .eq("id", row["id"]);
      if (error === null) {
        row["display_id"] = displayId;
      }
    }
  }
}

// List all route signups (paginated, filterable)
routeSignupRoutes.get("/api/route-signups", requirePermission("viewRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const rawPage = Number(c.req.query("page"));
  const rawLimit = Number(c.req.query("limit"));
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const limit = Math.min(10000, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const status = c.req.query("status") ?? "";
  const q = c.req.query("q") ?? "";
  const origin = c.req.query("origin") ?? "";
  const destination = c.req.query("destination") ?? "";
  const dateFrom = c.req.query("dateFrom") ?? "";
  const dateTo = c.req.query("dateTo") ?? "";

  let query = supabase
    .from("announcement_signups")
    .select("*", { count: "exact" });

  if (status !== "") query = query.eq("status", status);
  if (origin !== "") query = query.ilike("origin", `%${sanitizePostgrestValue(origin)}%`);
  if (destination !== "") query = query.ilike("destination", `%${sanitizePostgrestValue(destination)}%`);
  if (dateFrom !== "") query = query.gte("inserted_at", dateFrom);
  if (dateTo !== "") query = query.lte("inserted_at", `${dateTo}T23:59:59.999Z`);
  if (q !== "") {
    const safeQ = sanitizePostgrestValue(q);
    query = query.or(
      `first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,origin.ilike.%${safeQ}%,destination.ilike.%${safeQ}%`
    );
  }

  const { data, error, count } = await query
    .order("inserted_at", { ascending: false })
    .range(from, to);

  if (error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  const db = c.get("db");

  // Auto-assign display IDs to rows missing them
  await ensureDisplayIds(supabase, db, data);

  // Fetch last activity dates from D1
  const signupIds = data.map((s: { id: string }) => s.id);
  let enriched = data;
  if (signupIds.length > 0) {
    const lastDates = await db
      .select({
        routeSignupId: activities.routeSignupId,
        lastActivityDate: sql<string>`max(${activities.activityDate})`,
      })
      .from(activities)
      .where(inArray(activities.routeSignupId, signupIds))
      .groupBy(activities.routeSignupId);

    const dateMap = new Map(lastDates.map((r) => [r.routeSignupId, r.lastActivityDate]));
    enriched = data.map((s: { id: string }) => ({
      ...s,
      lastActivityDate: dateMap.get(s.id) ?? null,
    }));
  }

  return c.json({ data: enriched, meta: { page, limit, total: count ?? 0 } });
});

// Get single route signup
routeSignupRoutes.get("/api/route-signups/:id", requirePermission("viewRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const db = c.get("db");
  const result = await supabase
    .from("announcement_signups")
    .select("*")
    .eq("id", c.req.param("id"))
    .single<Record<string, unknown>>();

  if (result.error !== null) {
    throw notFound(ERROR_CODES.ROUTE_SIGNUP_NOT_FOUND, result.error.message);
  }

  // Auto-assign display ID if missing
  await ensureDisplayIds(supabase, db, [result.data]);

  // Fetch next action from D1
  const nextAction = await getNextAction(db, "route_signup", c.req.param("id"));

  return c.json({ data: { ...result.data, nextAction: nextAction ?? null } });
});

// Update route signup (status and/or note)
routeSignupRoutes.patch("/api/route-signups/:id", requirePermission("manageRouteSignups"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateRouteSignupSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const updateFields: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateFields["status"] = parsed.data.status;
  if (parsed.data.note !== undefined) updateFields["note"] = parsed.data.note;

  if (Object.keys(updateFields).length === 0) {
    throw badRequest(ERROR_CODES.NO_FIELDS_TO_UPDATE, "No fields to update");
  }

  const supabase = c.get("supabase");
  const result = await supabase
    .from("announcement_signups")
    .update(updateFields)
    .eq("id", c.req.param("id"))
    .select()
    .single<Record<string, unknown>>();

  if (result.error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, result.error.message);
  }

  // Clear next action when transitioning to a closed status
  if (typeof parsed.data.status === "string" && parsed.data.status.startsWith("closed_")) {
    const session = c.get("session");
    if (session !== null) {
      const db = c.get("db");
      await completeNextAction(db, "route_signup", c.req.param("id"), session.colleagueId);
    }
  }

  return c.json({ data: result.data });
});

// Delete route signup (admin only)
routeSignupRoutes.delete("/api/route-signups/:id", requirePermission("deleteRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const { error } = await supabase
    .from("announcement_signups")
    .delete()
    .eq("id", c.req.param("id"));

  if (error !== null) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  return c.json({ success: true });
});

// Update next action
routeSignupRoutes.patch("/api/route-signups/:id/next-action", requirePermission("manageRouteSignups"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateEntityNextActionSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "Invalid input", parsed.error.flatten().fieldErrors);
  }

  const session = c.get("session");
  if (session === null) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");
  const nextAction = await updateNextAction(db, "route_signup", c.req.param("id"), parsed.data, session.colleagueId);
  return c.json({ data: nextAction });
});

// Complete next action
routeSignupRoutes.post("/api/route-signups/:id/next-action/done", requirePermission("manageRouteSignups"), async (c) => {
  const session = c.get("session");
  if (session === null) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");
  await completeNextAction(db, "route_signup", c.req.param("id"), session.colleagueId);
  return c.json({ success: true });
});

// GET /api/route-signups/:id/emails
routeSignupRoutes.get("/api/route-signups/:id/emails", requirePermission("viewRouteSignups"), async (c) => {
  const data = await listEmailsForEntity(c.get("db"), "routeSignupId", c.req.param("id"));
  return c.json({ data });
});

// GET /api/route-signups/:id/phone-numbers
routeSignupRoutes.get("/api/route-signups/:id/phone-numbers", requirePermission("viewRouteSignups"), async (c) => {
  const data = await listPhoneNumbersForEntity(c.get("db"), "routeSignupId", c.req.param("id"));
  return c.json({ data });
});

// POST /api/route-signups/:id/emails
routeSignupRoutes.post("/api/route-signups/:id/emails", requirePermission("manageRouteSignups"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createEmailSchema.parse(body);
  const result = await createEmail(c.get("db"), { ...data, routeSignupId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/route-signups/:id/emails/:emailId
routeSignupRoutes.delete("/api/route-signups/:id/emails/:emailId", requirePermission("manageRouteSignups"), async (c) => {
  await deleteEmail(c.get("db"), c.req.param("emailId"));
  return c.json({ success: true });
});

// POST /api/route-signups/:id/phone-numbers
routeSignupRoutes.post("/api/route-signups/:id/phone-numbers", requirePermission("manageRouteSignups"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPhoneNumberSchema.parse(body);
  const result = await createPhoneNumber(c.get("db"), { ...data, routeSignupId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/route-signups/:id/phone-numbers/:phoneId
routeSignupRoutes.delete("/api/route-signups/:id/phone-numbers/:phoneId", requirePermission("manageRouteSignups"), async (c) => {
  await deletePhoneNumber(c.get("db"), c.req.param("phoneId"));
  return c.json({ success: true });
});

// GET /api/route-signups/:id/social-ids
routeSignupRoutes.get("/api/route-signups/:id/social-ids", requirePermission("viewRouteSignups"), async (c) => {
  const data = await listSocialIdsForEntity(c.get("db"), "routeSignupId", c.req.param("id"));
  return c.json({ data });
});

// POST /api/route-signups/:id/social-ids
routeSignupRoutes.post("/api/route-signups/:id/social-ids", requirePermission("manageRouteSignups"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createSocialIdSchema.parse(body);
  const result = await createSocialId(c.get("db"), { ...data, routeSignupId: c.req.param("id") });
  return c.json({ data: result }, 201);
});

// DELETE /api/route-signups/:id/social-ids/:socialIdId
routeSignupRoutes.delete("/api/route-signups/:id/social-ids/:socialIdId", requirePermission("manageRouteSignups"), async (c) => {
  await deleteSocialId(c.get("db"), c.req.param("socialIdId"));
  return c.json({ success: true });
});

export { routeSignupRoutes };
