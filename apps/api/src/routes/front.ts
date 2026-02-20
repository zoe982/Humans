import { Hono } from "hono";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal } from "../lib/errors";
import { syncFrontConversations } from "../services/front-sync";
import type { AppContext } from "../types";

const frontRoutes = new Hono<AppContext>();

frontRoutes.use("/*", authMiddleware);
frontRoutes.use("/*", supabaseMiddleware);

frontRoutes.post(
  "/api/admin/front/sync",
  requirePermission("manageColleagues"),
  async (c) => {
    const session = c.get("session")!;
    const db = c.get("db");
    const supabase = c.get("supabase");
    const frontToken = c.env.FRONT_API_TOKEN;

    if (!frontToken) {
      throw internal(ERROR_CODES.FRONT_SYNC_FAILED, "FRONT_API_TOKEN not configured");
    }

    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
    const cursor = c.req.query("cursor") || undefined;

    try {
      const result = await syncFrontConversations(
        db,
        supabase,
        frontToken,
        session.colleagueId,
        cursor,
        limit,
      );
      return c.json({ data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw internal(ERROR_CODES.FRONT_SYNC_FAILED, `Front sync failed: ${msg}`);
    }
  },
);

export { frontRoutes };
