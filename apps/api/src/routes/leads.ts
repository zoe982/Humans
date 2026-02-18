import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { leadSources, leadEvents } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createLeadSourceSchema, createLeadEventSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const leadRoutes = new Hono<AppContext>();

leadRoutes.use("/*", authMiddleware);

// Lead Sources
leadRoutes.get("/api/leads/sources", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const sources = await db.select().from(leadSources);
  return c.json({ data: sources });
});

leadRoutes.post("/api/leads/sources", requirePermission("manageLeadSources"), async (c) => {
  const body = await c.req.json();
  const data = createLeadSourceSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const newSource = {
    id: createId(),
    ...data,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(leadSources).values(newSource);
  return c.json({ data: newSource }, 201);
});

// Lead Events
leadRoutes.get("/api/leads/events", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const clientId = c.req.query("clientId");

  if (clientId) {
    const events = await db
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.clientId, clientId));
    return c.json({ data: events });
  }

  const events = await db.select().from(leadEvents);
  return c.json({ data: events });
});

leadRoutes.post("/api/leads/events", requirePermission("recordLeadEvents"), async (c) => {
  const body = await c.req.json();
  const data = createLeadEventSchema.parse(body);
  const db = c.get("db");
  const session = c.get("session");

  const newEvent = {
    id: createId(),
    ...data,
    notes: data.notes ?? null,
    metadata: data.metadata ?? null,
    createdByUserId: session?.userId ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(leadEvents).values(newEvent);
  return c.json({ data: newEvent }, 201);
});

export { leadRoutes };
