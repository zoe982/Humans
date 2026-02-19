import { Hono } from "hono";
import { updateRouteSignupSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import type { AppContext } from "../types";

const routeSignupRoutes = new Hono<AppContext>();

routeSignupRoutes.use("/*", authMiddleware);
routeSignupRoutes.use("/*", supabaseMiddleware);

// List all route signups
routeSignupRoutes.get("/api/route-signups", requirePermission("viewRouteSignups"), async (c) => {
  const supabase = c.get("supabase");
  const { data, error } = await supabase
    .from("announcement_signups")
    .select("*")
    .order("inserted_at", { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ data });
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
    return c.json({ error: error.message }, 404);
  }

  return c.json({ data });
});

// Update route signup (status and/or note)
routeSignupRoutes.patch("/api/route-signups/:id", requirePermission("manageRouteSignups"), async (c) => {
  const body: unknown = await c.req.json();
  const parsed = updateRouteSignupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const updateFields: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updateFields["status"] = parsed.data.status;
  if (parsed.data.note !== undefined) updateFields["note"] = parsed.data.note;

  if (Object.keys(updateFields).length === 0) {
    return c.json({ error: "No fields to update" }, 400);
  }

  const supabase = c.get("supabase");
  const { data, error } = await supabase
    .from("announcement_signups")
    .update(updateFields)
    .eq("id", c.req.param("id"))
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
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
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true });
});

export { routeSignupRoutes };
