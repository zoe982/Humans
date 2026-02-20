import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listErrorLogEntries,
  getErrorLogEntry,
  updateErrorLogResolution,
  cleanupErrorLog,
} from "../services/error-log";
import type { AppContext } from "../types";

const errorLogRoutes = new Hono<AppContext>();

errorLogRoutes.use("/*", authMiddleware);

// List recent errors (admin only, paginated, filterable)
errorLogRoutes.get("/api/admin/error-log", requirePermission("manageColleagues"), async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const data = await listErrorLogEntries(c.get("db"), {
    limit,
    offset,
    code: c.req.query("code"),
    path: c.req.query("path"),
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    resolutionStatus: c.req.query("resolutionStatus"),
  });

  // Auto-purge entries older than 7 days
  c.executionCtx.waitUntil(cleanupErrorLog(c.get("db")));

  return c.json({ data });
});

// Get single error log entry
errorLogRoutes.get("/api/admin/error-log/:id", requirePermission("manageColleagues"), async (c) => {
  const data = await getErrorLogEntry(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Update resolution status
errorLogRoutes.patch("/api/admin/error-log/:id/resolution", requirePermission("manageColleagues"), async (c) => {
  const { resolutionStatus } = await c.req.json<{ resolutionStatus: string }>();
  const data = await updateErrorLogResolution(c.get("db"), c.req.param("id"), resolutionStatus);
  return c.json({ data });
});

// Cleanup: purge entries older than 7 days
errorLogRoutes.delete("/api/admin/error-log/cleanup", requirePermission("manageColleagues"), async (c) => {
  await cleanupErrorLog(c.get("db"));
  return c.json({ success: true });
});

export { errorLogRoutes };
