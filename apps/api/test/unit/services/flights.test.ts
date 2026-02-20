import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listFlights,
  getFlight,
  createFlight,
  updateFlight,
} from "../../../src/services/flights";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

async function seedFlight(
  db: ReturnType<typeof getTestDb>,
  id = "fl-1",
  flightNumber = "AA100",
) {
  const ts = now();
  await db.insert(schema.flights).values({
    id,
    flightNumber,
    departureAirport: "JFK",
    arrivalAirport: "CDG",
    departureDate: "2026-06-01T08:00:00Z",
    arrivalDate: "2026-06-01T20:00:00Z",
    airline: "American Airlines",
    maxPets: 4,
    status: "scheduled",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

describe("listFlights", () => {
  it("returns empty list when no flights", async () => {
    const db = getTestDb();
    const result = await listFlights(db);
    expect(result).toHaveLength(0);
  });

  it("returns all flights", async () => {
    const db = getTestDb();
    await seedFlight(db, "fl-1", "AA100");
    await seedFlight(db, "fl-2", "BA200");

    const result = await listFlights(db);
    expect(result).toHaveLength(2);
  });
});

describe("getFlight", () => {
  it("throws not found for missing flight", async () => {
    const db = getTestDb();
    await expect(getFlight(db, "nonexistent")).rejects.toThrowError("Flight not found");
  });

  it("returns flight by id", async () => {
    const db = getTestDb();
    await seedFlight(db, "fl-1", "AA100");

    const result = await getFlight(db, "fl-1");
    expect(result.id).toBe("fl-1");
    expect(result.flightNumber).toBe("AA100");
    expect(result.departureAirport).toBe("JFK");
    expect(result.arrivalAirport).toBe("CDG");
    expect(result.airline).toBe("American Airlines");
    expect(result.status).toBe("scheduled");
  });
});

describe("createFlight", () => {
  it("creates a flight with required fields", async () => {
    const db = getTestDb();

    const result = await createFlight(db, {
      flightNumber: "UA300",
      departureAirport: "LAX",
      arrivalAirport: "LHR",
      departureDate: "2026-07-01T10:00:00Z",
      arrivalDate: "2026-07-02T06:00:00Z",
      airline: "United Airlines",
      maxPets: 2,
    });

    expect(result.id).toBeDefined();
    expect(result.flightNumber).toBe("UA300");
    expect(result.cabinClass).toBeNull();
    expect(result.status).toBe("scheduled");

    const rows = await db.select().from(schema.flights);
    expect(rows).toHaveLength(1);
  });

  it("creates a flight with optional cabin class and custom status", async () => {
    const db = getTestDb();

    const result = await createFlight(db, {
      flightNumber: "DL400",
      departureAirport: "SFO",
      arrivalAirport: "NRT",
      departureDate: "2026-08-01T14:00:00Z",
      arrivalDate: "2026-08-02T17:00:00Z",
      airline: "Delta",
      maxPets: 3,
      cabinClass: "business",
      status: "delayed",
    });

    expect(result.cabinClass).toBe("business");
    expect(result.status).toBe("delayed");
  });
});

describe("updateFlight", () => {
  it("throws not found for missing flight", async () => {
    const db = getTestDb();
    await expect(
      updateFlight(db, "nonexistent", { status: "cancelled" }),
    ).rejects.toThrowError("Flight not found");
  });

  it("updates flight fields", async () => {
    const db = getTestDb();
    await seedFlight(db, "fl-1");

    const result = await updateFlight(db, "fl-1", {
      status: "departed",
      maxPets: 6,
    });

    expect(result!.status).toBe("departed");
    expect(result!.maxPets).toBe(6);
    expect(result!.updatedAt).toBeDefined();
  });
});
