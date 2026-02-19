import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { clients } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createClientSchema, updateClientSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const clientRoutes = new Hono<AppContext>();

clientRoutes.use("/*", authMiddleware);

clientRoutes.get("/api/clients", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allClients = await db.select().from(clients);
  return c.json({ data: allClients });
});

clientRoutes.get("/api/clients/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, c.req.param("id")),
  });
  if (client == null) {
    return c.json({ error: "Client not found" }, 404);
  }
  return c.json({ data: client });
});

clientRoutes.post("/api/clients", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createClientSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const newClient = {
    id: createId(),
    ...data,
    phone: data.phone ?? null,
    address: data.address ?? null,
    status: data.status ?? ("prospect" as const),
    notes: data.notes ?? null,
    leadSourceId: data.leadSourceId ?? null,
    assignedToUserId: data.assignedToUserId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(clients).values(newClient);
  return c.json({ data: newClient }, 201);
});

clientRoutes.patch("/api/clients/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateClientSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.clients.findFirst({
    where: eq(clients.id, c.req.param("id")),
  });
  if (existing == null) {
    return c.json({ error: "Client not found" }, 404);
  }

  await db
    .update(clients)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(clients.id, c.req.param("id")));

  const updated = await db.query.clients.findFirst({
    where: eq(clients.id, c.req.param("id")),
  });
  return c.json({ data: updated });
});

clientRoutes.delete("/api/clients/:id", requirePermission("createEditRecords"), async (c) => {
  const db = c.get("db");
  const existing = await db.query.clients.findFirst({
    where: eq(clients.id, c.req.param("id")),
  });
  if (existing == null) {
    return c.json({ error: "Client not found" }, 404);
  }

  await db.delete(clients).where(eq(clients.id, c.req.param("id")));
  return c.json({ success: true });
});

export { clientRoutes };
