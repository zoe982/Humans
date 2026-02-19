import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { flightBookings } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createBookingSchema, updateBookingSchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound } from "../lib/errors";
import type { AppContext } from "../types";

const bookingRoutes = new Hono<AppContext>();

bookingRoutes.use("/*", authMiddleware);

bookingRoutes.get("/api/bookings", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allBookings = await db.select().from(flightBookings);
  return c.json({ data: allBookings });
});

bookingRoutes.get("/api/bookings/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const booking = await db.query.flightBookings.findFirst({
    where: eq(flightBookings.id, c.req.param("id")),
  });
  if (booking == null) {
    throw notFound(ERROR_CODES.BOOKING_NOT_FOUND, "Booking not found");
  }
  return c.json({ data: booking });
});

bookingRoutes.post("/api/bookings", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createBookingSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const newBooking = {
    id: createId(),
    ...data,
    bookingStatus: "pending" as const,
    specialInstructions: data.specialInstructions ?? null,
    confirmationR2Key: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(flightBookings).values(newBooking);
  return c.json({ data: newBooking }, 201);
});

bookingRoutes.patch("/api/bookings/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateBookingSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.flightBookings.findFirst({
    where: eq(flightBookings.id, c.req.param("id")),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.BOOKING_NOT_FOUND, "Booking not found");
  }

  await db
    .update(flightBookings)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(flightBookings.id, c.req.param("id")));

  const updated = await db.query.flightBookings.findFirst({
    where: eq(flightBookings.id, c.req.param("id")),
  });
  return c.json({ data: updated });
});

export { bookingRoutes };
