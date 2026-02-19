import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { flights } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createFlightSchema, updateFlightSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const flightRoutes = new Hono<AppContext>();

flightRoutes.use("/*", authMiddleware);

flightRoutes.get("/api/flights", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allFlights = await db.select().from(flights);
  return c.json({ data: allFlights });
});

flightRoutes.get("/api/flights/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const flight = await db.query.flights.findFirst({
    where: eq(flights.id, c.req.param("id")),
  });
  if (flight == null) {
    return c.json({ error: "Flight not found" }, 404);
  }
  return c.json({ data: flight });
});

flightRoutes.post("/api/flights", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createFlightSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const newFlight = {
    id: createId(),
    ...data,
    cabinClass: data.cabinClass ?? null,
    status: data.status ?? ("scheduled" as const),
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(flights).values(newFlight);
  return c.json({ data: newFlight }, 201);
});

flightRoutes.patch("/api/flights/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateFlightSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.flights.findFirst({
    where: eq(flights.id, c.req.param("id")),
  });
  if (existing == null) {
    return c.json({ error: "Flight not found" }, 404);
  }

  await db
    .update(flights)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(flights.id, c.req.param("id")));

  const updated = await db.query.flights.findFirst({
    where: eq(flights.id, c.req.param("id")),
  });
  return c.json({ data: updated });
});

export { flightRoutes };
