import { Hono } from "hono";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { internal } from "../lib/errors";
import {
  syncFrontConversations,
  listSyncRuns,
  getSyncRun,
  revertSyncRun,
} from "../services/front-sync";
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
      throw internal(
        ERROR_CODES.FRONT_SYNC_FAILED,
        "FRONT_API_TOKEN not configured",
      );
    }

    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
    const cursor = c.req.query("cursor") || undefined;
    const syncRunId = c.req.query("syncRunId") || undefined;

    try {
      const result = await syncFrontConversations(
        db,
        supabase,
        frontToken,
        session.colleagueId,
        cursor,
        limit,
        syncRunId,
      );
      return c.json({ data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw internal(ERROR_CODES.FRONT_SYNC_FAILED, `Front sync failed: ${msg}`);
    }
  },
);

// List all sync runs
frontRoutes.get(
  "/api/admin/front/sync-runs",
  requirePermission("manageColleagues"),
  async (c) => {
    const data = await listSyncRuns(c.get("db"));
    return c.json({ data });
  },
);

// Get single sync run
frontRoutes.get(
  "/api/admin/front/sync-runs/:id",
  requirePermission("manageColleagues"),
  async (c) => {
    const data = await getSyncRun(c.get("db"), c.req.param("id"));
    if (!data) {
      return c.json({ error: "Sync run not found" }, 404);
    }
    return c.json({ data });
  },
);

// Revert a sync run
frontRoutes.post(
  "/api/admin/front/sync-runs/:id/revert",
  requirePermission("manageColleagues"),
  async (c) => {
    const result = await revertSyncRun(c.get("db"), c.req.param("id"));
    if (result.error) {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ data: result });
  },
);

export { frontRoutes };
