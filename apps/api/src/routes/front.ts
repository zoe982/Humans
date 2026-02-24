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
  debugUnmatchedContact,
  reclassifyActivities,
  backfillAuthorNames,
} from "../services/front-sync";
import type { AppContext } from "../types";

const frontRoutes = new Hono<AppContext>();

frontRoutes.use("/*", authMiddleware);
frontRoutes.use("/*", supabaseMiddleware);

frontRoutes.post(
  "/api/admin/front/sync",
  requirePermission("manageColleagues"),
  async (c) => {
    const session = c.get("session");
    if (session === null) return c.json({ error: "Unauthorized" }, 401);
    const db = c.get("db");
    const supabase = c.get("supabase");
    const frontToken = c.env.FRONT_API_TOKEN;

    if (frontToken === "") {
      throw internal(
        ERROR_CODES.FRONT_SYNC_FAILED,
        "FRONT_API_TOKEN not configured",
      );
    }

    const rawLimit = Number(c.req.query("limit"));
    const limit = Math.min(50, Math.max(1, rawLimit !== 0 ? rawLimit : 20));
    const rawCursor = c.req.query("cursor");
    const cursor = rawCursor !== undefined && rawCursor !== "" ? rawCursor : undefined;
    const rawSyncRunId = c.req.query("syncRunId");
    const syncRunId = rawSyncRunId !== undefined && rawSyncRunId !== "" ? rawSyncRunId : undefined;

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
    if (data === null) {
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
    if (result.error !== undefined && result.error !== "") {
      return c.json({ error: result.error }, 400);
    }
    return c.json({ data: result });
  },
);

// Debug an unmatched conversation
frontRoutes.get(
  "/api/admin/front/conversations/:conversationId/debug",
  requirePermission("manageColleagues"),
  async (c) => {
    const db = c.get("db");
    const supabase = c.get("supabase");
    const frontToken = c.env.FRONT_API_TOKEN;

    if (frontToken === "") {
      throw internal(
        ERROR_CODES.FRONT_SYNC_FAILED,
        "FRONT_API_TOKEN not configured",
      );
    }

    const conversationId = c.req.param("conversationId");
    const handle = c.req.query("handle") ?? "";

    try {
      const result = await debugUnmatchedContact(
        db,
        supabase,
        frontToken,
        conversationId,
        handle,
      );
      return c.json({ data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw internal(ERROR_CODES.FRONT_SYNC_FAILED, `Debug failed: ${msg}`);
    }
  },
);

// Reclassify mistyped activities by re-fetching message type from Front
frontRoutes.post(
  "/api/admin/front/sync/reclassify",
  requirePermission("manageColleagues"),
  async (c) => {
    const db = c.get("db");
    const frontToken = c.env.FRONT_API_TOKEN;

    if (frontToken === "") {
      throw internal(
        ERROR_CODES.FRONT_SYNC_FAILED,
        "FRONT_API_TOKEN not configured",
      );
    }

    const rawCursor = c.req.query("cursor");
    const cursor = rawCursor !== undefined && rawCursor !== "" ? rawCursor : undefined;

    try {
      const result = await reclassifyActivities(db, frontToken, cursor);
      return c.json({ data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw internal(ERROR_CODES.FRONT_SYNC_FAILED, `Reclassify failed: ${msg}`);
    }
  },
);

// Backfill author names for existing activities from Front API
frontRoutes.post(
  "/api/admin/front/sync/backfill-authors",
  requirePermission("manageColleagues"),
  async (c) => {
    const db = c.get("db");
    const frontToken = c.env.FRONT_API_TOKEN;

    if (frontToken === "") {
      throw internal(
        ERROR_CODES.FRONT_SYNC_FAILED,
        "FRONT_API_TOKEN not configured",
      );
    }

    const rawCursor = c.req.query("cursor");
    const cursor = rawCursor !== undefined && rawCursor !== "" ? rawCursor : undefined;

    try {
      const result = await backfillAuthorNames(db, frontToken, cursor);
      return c.json({ data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw internal(ERROR_CODES.FRONT_SYNC_FAILED, `Backfill failed: ${msg}`);
    }
  },
);

export { frontRoutes };
