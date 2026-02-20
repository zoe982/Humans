import { eq } from "drizzle-orm";
import { flights } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import type { DB } from "./types";

export async function listFlights(db: DB) {
  const allFlights = await db.select().from(flights);
  return allFlights;
}

export async function getFlight(db: DB, id: string) {
  const flight = await db.query.flights.findFirst({
    where: eq(flights.id, id),
  });
  if (flight == null) {
    throw notFound(ERROR_CODES.FLIGHT_NOT_FOUND, "Flight not found");
  }
  return flight;
}

export async function createFlight(
  db: DB,
  data: {
    cabinClass?: string | null;
    status?: string;
    [key: string]: unknown;
  },
) {
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
  return newFlight;
}

export async function updateFlight(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.flights.findFirst({
    where: eq(flights.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.FLIGHT_NOT_FOUND, "Flight not found");
  }

  await db
    .update(flights)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(flights.id, id));

  const updated = await db.query.flights.findFirst({
    where: eq(flights.id, id),
  });
  return updated;
}
