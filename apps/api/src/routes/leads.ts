import { Hono } from "hono";
import { createLeadSourceSchema, createLeadEventSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listLeadSources,
  createLeadSource,
  listLeadEvents,
  createLeadEvent,
} from "../services/leads";
import type { AppContext } from "../types";

const leadRoutes = new Hono<AppContext>();

leadRoutes.use("/*", authMiddleware);

// Lead Sources
leadRoutes.get("/api/leads/sources", requirePermission("viewRecords"), async (c) => {
  const data = await listLeadSources(c.get("db"));
  return c.json({ data });
});

leadRoutes.post("/api/leads/sources", requirePermission("manageLeadSources"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createLeadSourceSchema.parse(body);
  const result = await createLeadSource(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Lead Events
leadRoutes.get("/api/leads/events", requirePermission("viewRecords"), async (c) => {
  const humanId = c.req.query("humanId");
  const data = await listLeadEvents(c.get("db"), humanId);
  return c.json({ data });
});

leadRoutes.post("/api/leads/events", requirePermission("recordLeadEvents"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createLeadEventSchema.parse(body);
  const session = c.get("session");
  const result = await createLeadEvent(c.get("db"), data, session?.colleagueId ?? null);
  return c.json({ data: result }, 201);
});

export { leadRoutes };
