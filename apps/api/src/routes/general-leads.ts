import { Hono } from "hono";
import {
  createGeneralLeadSchema,
  updateGeneralLeadSchema,
  updateGeneralLeadStatusSchema,
  convertGeneralLeadSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listGeneralLeads,
  getGeneralLead,
  createGeneralLead,
  updateGeneralLead,
  updateGeneralLeadStatus,
  convertGeneralLead,
  deleteGeneralLead,
} from "../services/general-leads";
import type { AppContext } from "../types";

const generalLeadRoutes = new Hono<AppContext>();

generalLeadRoutes.use("/*", authMiddleware);

// GET /api/general-leads
generalLeadRoutes.get("/api/general-leads", requirePermission("viewGeneralLeads"), async (c) => {
  const db = c.get("db");
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 25));
  const q = c.req.query("q") || undefined;
  const status = c.req.query("status") || undefined;
  const source = c.req.query("source") || undefined;
  const convertedHumanId = c.req.query("convertedHumanId") || undefined;
  const result = await listGeneralLeads(db, page, limit, { q, status, source, convertedHumanId });
  return c.json(result);
});

// GET /api/general-leads/:id
generalLeadRoutes.get("/api/general-leads/:id", requirePermission("viewGeneralLeads"), async (c) => {
  const data = await getGeneralLead(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// POST /api/general-leads
generalLeadRoutes.post("/api/general-leads", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createGeneralLeadSchema.parse(body);
  const session = c.get("session")!;
  const result = await createGeneralLead(c.get("db"), data, session.colleagueId);
  return c.json({ data: result }, 201);
});

// PATCH /api/general-leads/:id
generalLeadRoutes.patch("/api/general-leads/:id", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateGeneralLeadSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateGeneralLead(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// PATCH /api/general-leads/:id/status
generalLeadRoutes.patch("/api/general-leads/:id/status", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateGeneralLeadStatusSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateGeneralLeadStatus(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// POST /api/general-leads/:id/convert
generalLeadRoutes.post("/api/general-leads/:id/convert", requirePermission("manageGeneralLeads"), async (c) => {
  const body: unknown = await c.req.json();
  const data = convertGeneralLeadSchema.parse(body);
  const session = c.get("session")!;
  const result = await convertGeneralLead(c.get("db"), c.req.param("id"), data.humanId, session.colleagueId);
  return c.json(result);
});

// DELETE /api/general-leads/:id
generalLeadRoutes.delete("/api/general-leads/:id", requirePermission("deleteGeneralLeads"), async (c) => {
  await deleteGeneralLead(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { generalLeadRoutes };
