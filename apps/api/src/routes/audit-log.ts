import { Hono } from "hono";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { badRequest } from "../lib/errors";
import { getAuditEntries, undoAuditEntry } from "../services/audit-log";
import type { AppContext } from "../types";

const auditLogRoutes = new Hono<AppContext>();

auditLogRoutes.use("/*", authMiddleware);

// GET /api/audit-log?entityType=X&entityId=Y
auditLogRoutes.get("/api/audit-log", requirePermission("viewRecords"), async (c) => {
  const entityType = c.req.query("entityType");
  const entityId = c.req.query("entityId");

  if (!entityType || !entityId) {
    throw badRequest(ERROR_CODES.VALIDATION_FAILED, "entityType and entityId are required");
  }

  const entries = await getAuditEntries(c.get("db"), entityType, entityId);
  return c.json({ data: entries });
});

// POST /api/audit-log/:id/undo
auditLogRoutes.post("/api/audit-log/:id/undo", requirePermission("createEditRecords"), async (c) => {
  const session = c.get("session")!;
  const result = await undoAuditEntry(c.get("db"), c.req.param("id"), session.colleagueId);
  return c.json({ data: result });
});

export { auditLogRoutes };
