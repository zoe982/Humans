import { Hono } from "hono";
import {
  updateLeadScoreFlagsSchema,
  ensureLeadScoreSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listLeadScores,
  getLeadScore,
  getLeadScoreByParent,
  updateLeadScoreFlags,
  ensureLeadScore,
} from "../services/lead-scores";
import { assertUniqueIds } from "../lib/assert-unique-ids";
import type { AppContext } from "../types";

const leadScoreRoutes = new Hono<AppContext>();

leadScoreRoutes.use("/*", authMiddleware);

// GET /api/lead-scores
leadScoreRoutes.get("/api/lead-scores", requirePermission("viewLeadScores"), supabaseMiddleware, async (c) => {
  const db = c.get("db");
  const rawPage = Number(c.req.query("page"));
  const rawLimit = Number(c.req.query("limit"));
  const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
  const limit = Math.min(10000, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 25));
  const rawQ = c.req.query("q");
  const q = rawQ !== undefined && rawQ !== "" ? rawQ : undefined;
  const rawBand = c.req.query("band");
  const band = rawBand !== undefined && rawBand !== "" ? rawBand : undefined;
  const rawParentType = c.req.query("parentType");
  const parentType = rawParentType !== undefined && rawParentType !== "" ? rawParentType : undefined;

  const filters: { q?: string; band?: string; parentType?: string } = {};
  if (q !== undefined) filters.q = q;
  if (band !== undefined) filters.band = band;
  if (parentType !== undefined) filters.parentType = parentType;
  const result = await listLeadScores(db, page, limit, filters);
  result.data = assertUniqueIds(result.data, "lead-scores", c);

  // Enrich BOR/ROU parent display IDs from Supabase
  const borIds = result.data.filter((s) => s.websiteBookingRequestId != null && s.parentDisplayId == null).map((s) => s.websiteBookingRequestId as string);
  const rouIds = result.data.filter((s) => s.routeSignupId != null && s.parentDisplayId == null).map((s) => s.routeSignupId as string);

  const supabase = c.get("supabase");
  if (borIds.length > 0) {
    const { data: bors } = await supabase
      .from("bookings")
      .select("id, crm_display_id")
      .in("id", borIds);
    if (bors != null) {
      const borMap = new Map((bors as { id: string; crm_display_id: string | null }[]).map((b) => [b.id, b.crm_display_id]));
      for (const score of result.data) {
        if (score.websiteBookingRequestId != null && score.parentDisplayId == null) {
          score.parentDisplayId = borMap.get(score.websiteBookingRequestId) ?? null;
        }
      }
    }
  }

  if (rouIds.length > 0) {
    const { data: rous } = await supabase
      .from("announcement_signups")
      .select("id, display_id")
      .in("id", rouIds);
    if (rous != null) {
      const rouMap = new Map((rous as { id: string; display_id: string | null }[]).map((r) => [r.id, r.display_id]));
      for (const score of result.data) {
        if (score.routeSignupId != null && score.parentDisplayId == null) {
          score.parentDisplayId = rouMap.get(score.routeSignupId) ?? null;
        }
      }
    }
  }

  return c.json(result);
});

// GET /api/lead-scores/by-parent/:parentType/:parentId
leadScoreRoutes.get("/api/lead-scores/by-parent/:parentType/:parentId", requirePermission("viewLeadScores"), async (c) => {
  const db = c.get("db");
  const rawParentType = c.req.param("parentType");
  if (rawParentType !== "general_lead" && rawParentType !== "website_booking_request" && rawParentType !== "route_signup") {
    return c.json({ error: "Invalid parent type" }, 400);
  }
  const parentId = c.req.param("parentId");
  const result = await getLeadScoreByParent(db, rawParentType, parentId);
  if (result == null) {
    return c.json({ data: null });
  }
  return c.json({ data: result });
});

// GET /api/lead-scores/:id
leadScoreRoutes.get("/api/lead-scores/:id", requirePermission("viewLeadScores"), async (c) => {
  const db = c.get("db");
  const data = await getLeadScore(db, c.req.param("id"));
  return c.json({ data });
});

// PATCH /api/lead-scores/:id/flags
leadScoreRoutes.patch("/api/lead-scores/:id/flags", requirePermission("manageLeadScores"), async (c) => {
  const body: unknown = await c.req.json();
  const flags = updateLeadScoreFlagsSchema.parse(body);
  const db = c.get("db");
  const data = await updateLeadScoreFlags(db, c.req.param("id"), flags);
  return c.json({ data });
});

// POST /api/lead-scores/ensure
leadScoreRoutes.post("/api/lead-scores/ensure", requirePermission("manageLeadScores"), async (c) => {
  const body: unknown = await c.req.json();
  const { parentType, parentId } = ensureLeadScoreSchema.parse(body);
  const db = c.get("db");
  const data = await ensureLeadScore(db, parentType, parentId);
  return c.json({ data });
});

export { leadScoreRoutes };
