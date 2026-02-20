import { Hono } from "hono";
import { createFlightSchema, updateFlightSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listFlights,
  getFlight,
  createFlight,
  updateFlight,
} from "../services/flights";
import type { AppContext } from "../types";

const flightRoutes = new Hono<AppContext>();

flightRoutes.use("/*", authMiddleware);

flightRoutes.get("/api/flights", requirePermission("viewRecords"), async (c) => {
  const data = await listFlights(c.get("db"));
  return c.json({ data });
});

flightRoutes.get("/api/flights/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getFlight(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

flightRoutes.post("/api/flights", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createFlightSchema.parse(body);
  const result = await createFlight(c.get("db"), data);
  return c.json({ data: result }, 201);
});

flightRoutes.patch("/api/flights/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateFlightSchema.parse(body);
  const result = await updateFlight(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

export { flightRoutes };
