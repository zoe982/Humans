import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { activities, humanRouteSignups } from "@humans/db/schema";
import { createHumanSchema, updateHumanSchema, updateHumanStatusSchema, linkRouteSignupSchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { notFound, internal } from "../lib/errors";
import { createId } from "@humans/db";
import {
  listHumans,
  getHumanDetail,
  createHuman,
  updateHuman,
  updateHumanStatus,
  deleteHuman,
  linkRouteSignup,
  unlinkRouteSignup,
} from "../services/humans";
import type { AppContext } from "../types";

const humanRoutes = new Hono<AppContext>();

humanRoutes.use("/*", authMiddleware);

humanRoutes.get("/api/humans", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 25));
  const q = c.req.query("q") || undefined;
  const result = await listHumans(db, page, limit, q);
  return c.json(result);
});

humanRoutes.get("/api/humans/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getHumanDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

humanRoutes.post("/api/humans", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createHumanSchema.parse(body);
  const result = await createHuman(c.get("db"), data);
  return c.json({ data: result }, 201);
});

humanRoutes.patch("/api/humans/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateHumanSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateHuman(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

humanRoutes.patch("/api/humans/:id/status", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateHumanStatusSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateHumanStatus(c.get("db"), c.req.param("id"), data.status, session.colleagueId);
  return c.json({ data: { id: result.id, status: result.status }, auditEntryId: result.auditEntryId });
});

humanRoutes.delete("/api/humans/:id", requirePermission("deleteHumans"), async (c) => {
  await deleteHuman(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

humanRoutes.post("/api/humans/:id/route-signups", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkRouteSignupSchema.parse(body);
  const link = await linkRouteSignup(c.get("db"), c.req.param("id"), data.routeSignupId);
  return c.json({ data: link }, 201);
});

humanRoutes.delete("/api/humans/:id/route-signups/:linkId", requirePermission("manageHumans"), async (c) => {
  await unlinkRouteSignup(c.get("db"), c.req.param("linkId"));
  return c.json({ success: true });
});

// Convert from signup: link signup, update Supabase status, re-parent activities
humanRoutes.post(
  "/api/humans/:id/convert-from-signup",
  requirePermission("manageHumans"),
  supabaseMiddleware,
  async (c) => {
    const body: unknown = await c.req.json();
    const data = linkRouteSignupSchema.parse(body);
    const db = c.get("db");
    const supabase = c.get("supabase");
    const humanId = c.req.param("id");

    const link = await linkRouteSignup(db, humanId, data.routeSignupId);

    const { error: supaError } = await supabase
      .from("announcement_signups")
      .update({ status: "closed_converted" })
      .eq("id", data.routeSignupId);

    if (supaError) {
      throw internal(ERROR_CODES.SUPABASE_ERROR, `Supabase update failed: ${supaError.message}`);
    }

    await db
      .update(activities)
      .set({ humanId, updatedAt: new Date().toISOString() })
      .where(eq(activities.routeSignupId, data.routeSignupId));

    return c.json({ data: { link, status: "closed_converted" } });
  },
);

export { humanRoutes };
