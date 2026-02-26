import { Hono } from "hono";
import { createSocialIdSchema, updateSocialIdSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listSocialIds,
  getSocialId,
  createSocialId,
  updateSocialId,
  deleteSocialId,
} from "../services/social-ids";
import type { AppContext } from "../types";

const socialIdRoutes = new Hono<AppContext>();

socialIdRoutes.use("/*", authMiddleware);

// List all social IDs
socialIdRoutes.get("/api/social-ids", requirePermission("viewRecords"), async (c) => {
  const data = await listSocialIds(c.get("db"), c.req.query("q"));
  return c.json({ data });
});

// Get single social ID (with Supabase enrichment for BOR/ROU)
socialIdRoutes.get("/api/social-ids/:id", requirePermission("viewRecords"), supabaseMiddleware, async (c) => {
  const data = await getSocialId(c.get("db"), c.req.param("id"));

  if (data.websiteBookingRequestId != null) {
    const supabase = c.get("supabase");
    const { data: bor } = await supabase
      .from("bookings")
      .select("crm_display_id, first_name, last_name")
      .eq("id", data.websiteBookingRequestId)
      .single();
    if (bor != null) {
      const borData = bor as { crm_display_id?: string | null; first_name?: string | null; last_name?: string | null };
      data.websiteBookingRequestDisplayId = typeof borData.crm_display_id === "string" ? borData.crm_display_id : null;
      const borName = [borData.first_name, borData.last_name].filter(Boolean).join(" ");
      data.websiteBookingRequestName = borName !== "" ? borName : null;
    }
  }

  if (data.routeSignupId != null) {
    const supabase = c.get("supabase");
    const { data: rou } = await supabase
      .from("announcement_signups")
      .select("display_id, first_name, last_name")
      .eq("id", data.routeSignupId)
      .single();
    if (rou != null) {
      const rouData = rou as { display_id?: string | null; first_name?: string | null; last_name?: string | null };
      data.routeSignupDisplayId = typeof rouData.display_id === "string" ? rouData.display_id : null;
      const rouName = [rouData.first_name, rouData.last_name].filter(Boolean).join(" ");
      data.routeSignupName = rouName !== "" ? rouName : null;
    }
  }

  return c.json({ data });
});

// Create social ID
socialIdRoutes.post("/api/social-ids", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createSocialIdSchema.parse(body);
  const result = await createSocialId(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update social ID
socialIdRoutes.patch("/api/social-ids/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateSocialIdSchema.parse(body);
  const result = await updateSocialId(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete social ID
socialIdRoutes.delete("/api/social-ids/:id", requirePermission("manageHumans"), async (c) => {
  await deleteSocialId(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { socialIdRoutes };
