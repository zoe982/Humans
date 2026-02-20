import { eq } from "drizzle-orm";
import { flightBookings } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import type { DB } from "./types";

export async function listBookings(db: DB) {
  const allBookings = await db.select().from(flightBookings);
  return allBookings;
}

export async function getBooking(db: DB, id: string) {
  const booking = await db.query.flightBookings.findFirst({
    where: eq(flightBookings.id, id),
  });
  if (booking == null) {
    throw notFound(ERROR_CODES.BOOKING_NOT_FOUND, "Booking not found");
  }
  return booking;
}

export async function createBooking(
  db: DB,
  data: {
    petId: string;
    flightId: string;
    specialInstructions?: string | null;
    [key: string]: unknown;
  },
) {
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
  return newBooking;
}

export async function updateBooking(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.flightBookings.findFirst({
    where: eq(flightBookings.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.BOOKING_NOT_FOUND, "Booking not found");
  }

  await db
    .update(flightBookings)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(flightBookings.id, id));

  const updated = await db.query.flightBookings.findFirst({
    where: eq(flightBookings.id, id),
  });
  return updated;
}
