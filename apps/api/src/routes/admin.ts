import { Hono } from "hono";
import { createColleagueSchema, updateColleagueSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listColleagues,
  getColleague,
  createColleague,
  updateColleague,
  listAuditLog,
} from "../services/admin";
import type { AppContext } from "../types";

const adminRoutes = new Hono<AppContext>();

adminRoutes.use("/*", authMiddleware);

// Colleague management
adminRoutes.get("/api/admin/colleagues", requirePermission("manageColleagues"), async (c) => {
  const data = await listColleagues(c.get("db"));
  return c.json({ data });
});

adminRoutes.get("/api/admin/colleagues/:id", requirePermission("manageColleagues"), async (c) => {
  const data = await getColleague(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

adminRoutes.post("/api/admin/colleagues", requirePermission("manageColleagues"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createColleagueSchema.parse(body);
  const result = await createColleague(c.get("db"), data);
  return c.json({ data: result }, 201);
});

adminRoutes.patch("/api/admin/colleagues/:id", requirePermission("manageColleagues"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateColleagueSchema.parse(body);
  const result = await updateColleague(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Audit log
adminRoutes.get("/api/admin/audit-log", requirePermission("viewAuditLog"), async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const offset = Number(c.req.query("offset") ?? 0);
  const data = await listAuditLog(c.get("db"), limit, offset);
  return c.json({ data });
});

export { adminRoutes };
