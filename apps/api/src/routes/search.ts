import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { searchD1 } from "../services/search";
import type { AppContext } from "../types";

const searchRoutes = new Hono<AppContext>();

searchRoutes.use("/*", authMiddleware);

searchRoutes.get("/api/search", requirePermission("viewRecords"), supabaseMiddleware, async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ humans: [], routeSignups: [], activities: [], geoInterests: [], accounts: [] });
  }

  const db = c.get("db");
  const supabase = c.get("supabase");
  const pattern = `%${q}%`;

  // Run D1 search and Supabase search in parallel
  const [d1Results, supabaseResult] = await Promise.all([
    searchD1(db, q),
    supabase
      .from("announcement_signups")
      .select("*")
      .or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},origin.ilike.${pattern},destination.ilike.${pattern}`,
      ),
  ]);

  return c.json({
    humans: d1Results.matchedHumans,
    routeSignups: supabaseResult.data ?? [],
    activities: d1Results.activityResults,
    geoInterests: d1Results.geoInterestsWithCounts,
    accounts: d1Results.matchedAccounts,
  });
});

export { searchRoutes };
