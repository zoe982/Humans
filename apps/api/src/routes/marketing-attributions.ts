import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import {
  listMarketingAttributions,
  getMarketingAttribution,
} from "../services/marketing-attributions";
import type { AppContext } from "../types";

const marketingAttributionRoutes = new Hono<AppContext>();

marketingAttributionRoutes.use("/*", authMiddleware);
marketingAttributionRoutes.use("/*", supabaseMiddleware);

// List all marketing attributions
marketingAttributionRoutes.get("/api/marketing-attributions", requirePermission("viewMarketingAttributions"), async (c) => {
  const data = await listMarketingAttributions(c.get("supabase"), c.get("db"));
  return c.json({ data });
});

// Get single marketing attribution
marketingAttributionRoutes.get("/api/marketing-attributions/:id", requirePermission("viewMarketingAttributions"), async (c) => {
  const data = await getMarketingAttribution(c.get("supabase"), c.get("db"), c.req.param("id"));
  return c.json({ data });
});

export { marketingAttributionRoutes };
