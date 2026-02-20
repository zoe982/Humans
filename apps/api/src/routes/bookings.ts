import { Hono } from "hono";
import { createBookingSchema, updateBookingSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
} from "../services/bookings";
import type { AppContext } from "../types";

const bookingRoutes = new Hono<AppContext>();

bookingRoutes.use("/*", authMiddleware);

bookingRoutes.get("/api/bookings", requirePermission("viewRecords"), async (c) => {
  const data = await listBookings(c.get("db"));
  return c.json({ data });
});

bookingRoutes.get("/api/bookings/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getBooking(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

bookingRoutes.post("/api/bookings", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createBookingSchema.parse(body);
  const result = await createBooking(c.get("db"), data);
  return c.json({ data: result }, 201);
});

bookingRoutes.patch("/api/bookings/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateBookingSchema.parse(body);
  const result = await updateBooking(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

export { bookingRoutes };
