import { Hono } from "hono";
import { desc, eq, and, gte, lte, lt } from "drizzle-orm";
import { errorLog } from "@humans/db/schema";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const errorLogRoutes = new Hono<AppContext>();

errorLogRoutes.use("/*", authMiddleware);

// List recent errors (admin only, paginated, filterable)
errorLogRoutes.get("/api/admin/error-log", requirePermission("manageColleagues"), async (c) => {
  const db = c.get("db");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const code = c.req.query("code");
  const path = c.req.query("path");
  const dateFrom = c.req.query("dateFrom");
  const dateTo = c.req.query("dateTo");

  const conditions = [];
  if (code) conditions.push(eq(errorLog.code, code));
  if (path) conditions.push(eq(errorLog.path, path));
  if (dateFrom) conditions.push(gte(errorLog.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(errorLog.createdAt, dateTo));

  let results;
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(errorLog)
      .where(and(...conditions))
      .orderBy(desc(errorLog.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    results = await db
      .select()
      .from(errorLog)
      .orderBy(desc(errorLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return c.json({ data: results });
});

// Cleanup: purge entries older than 7 days
errorLogRoutes.delete("/api/admin/error-log/cleanup", requirePermission("manageColleagues"), async (c) => {
  const db = c.get("db");
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.delete(errorLog).where(lt(errorLog.createdAt, cutoff));

  return c.json({ success: true });
});

export { errorLogRoutes };
