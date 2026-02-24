import { Hono } from "hono";
import { sql, inArray } from "drizzle-orm";
import { activities } from "@humans/db/schema";
import { updateRouteSignupSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal, notFound, badRequest } from "../lib/errors";
import type { AppContext } from "../types";

const routeSignupRoutes = new Hono<AppContext>();

routeSignupRoutes.use("/*", authMiddleware);
routeSignupRoutes.use("/*", supabaseMiddleware);

// List all route signups (paginated, filterable)
routeSignupRoutes.get("/api/route-signups", requirePermission("viewRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 25));
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

  if (status) query = query.eq("status", status);
  if (origin) query = query.ilike("origin", `%${origin}%`);
  if (destination) query = query.ilike("destination", `%${destination}%`);
  if (dateFrom) query = query.gte("inserted_at", dateFrom);
  if (dateTo) query = query.lte("inserted_at", `${dateTo}T23:59:59.999Z`);
  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,origin.ilike.%${q}%,destination.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query
    .order("inserted_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  // Fetch last activity dates from D1
  const signupIds = (data ?? []).map((s: { id: string }) => s.id);
  let enriched = data ?? [];
  if (signupIds.length > 0) {
    const db = c.get("db");
    const lastDates = await db
      .select({
        routeSignupId: activities.routeSignupId,
        lastActivityDate: sql<string>`max(${activities.activityDate})`,
      })
      .from(activities)
      .where(inArray(activities.routeSignupId, signupIds))
      .groupBy(activities.routeSignupId);

    const dateMap = new Map(lastDates.map((r) => [r.routeSignupId, r.lastActivityDate]));
    enriched = (data ?? []).map((s: { id: string }) => ({
      ...s,
      lastActivityDate: dateMap.get(s.id) ?? null,
    }));
  }

  return c.json({ data: enriched, meta: { page, limit, total: count ?? 0 } });
});

// Get single route signup
routeSignupRoutes.get("/api/route-signups/:id", requirePermission("viewRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const { data, error } = await supabase
    .from("announcement_signups")
    .select("*")
    .eq("id", c.req.param("id"))
    .single();

  if (error) {
    throw notFound(ERROR_CODES.ROUTE_SIGNUP_NOT_FOUND, error.message);
  }

  return c.json({ data });
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
  const { data, error } = await supabase
    .from("announcement_signups")
    .update(updateFields)
    .eq("id", c.req.param("id"))
    .select()
    .single();

  if (error) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  return c.json({ data });
});

// Delete route signup (admin only)
routeSignupRoutes.delete("/api/route-signups/:id", requirePermission("deleteRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const { error } = await supabase
    .from("announcement_signups")
    .delete()
    .eq("id", c.req.param("id"));

  if (error) {
    throw internal(ERROR_CODES.SUPABASE_ERROR, error.message);
  }

  return c.json({ success: true });
});

export { routeSignupRoutes };
