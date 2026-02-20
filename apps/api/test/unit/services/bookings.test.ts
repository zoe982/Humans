import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listBookings,
  getBooking,
  createBooking,
  updateBooking,
} from "../../../src/services/bookings";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    email: `${id}@test.com`,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    role: "admin",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1") {
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    firstName: "John",
    lastName: "Doe",
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedClient(db: ReturnType<typeof getTestDb>, id = "cl-1") {
  const ts = now();
  await db.insert(schema.clients).values({
    id,
    firstName: "Client",
    lastName: "One",
    email: "client@test.com",
    status: "active",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedFlight(db: ReturnType<typeof getTestDb>, id = "fl-1") {
  const ts = now();
  await db.insert(schema.flights).values({
    id,
    flightNumber: "AA100",
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

async function seedPet(db: ReturnType<typeof getTestDb>, id = "pet-1", humanId = "h-1") {
  const ts = now();
  await db.insert(schema.pets).values({
    id,
    humanId,
    clientId: null,
    name: "Buddy",
    breed: "Labrador",
    weight: 30,
    age: 5,
    specialNeeds: null,
    healthCertR2Key: null,
    vaccinationR2Key: null,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

/** Seed all FK dependencies needed to create a valid booking */
async function seedBookingDeps(db: ReturnType<typeof getTestDb>) {
  await seedHuman(db, "h-1");
  await seedClient(db, "cl-1");
  await seedFlight(db, "fl-1");
  await seedPet(db, "pet-1", "h-1");
}

async function seedBooking(db: ReturnType<typeof getTestDb>, id = "bk-1") {
  const ts = now();
  await db.insert(schema.flightBookings).values({
    id,
    flightId: "fl-1",
    clientId: "cl-1",
    petId: "pet-1",
    humanId: "h-1",
    bookingStatus: "pending",
    price: 2500,
    confirmationR2Key: null,
    specialInstructions: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

describe("listBookings", () => {
  it("returns empty list when no bookings", async () => {
    const db = getTestDb();
    const result = await listBookings(db);
    expect(result).toHaveLength(0);
  });

  it("returns all bookings", async () => {
    const db = getTestDb();
    await seedBookingDeps(db);
    await seedBooking(db, "bk-1");

    const result = await listBookings(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("bk-1");
    expect(result[0]!.flightId).toBe("fl-1");
  });
});

describe("getBooking", () => {
  it("throws not found for missing booking", async () => {
    const db = getTestDb();
    await expect(getBooking(db, "nonexistent")).rejects.toThrowError("Booking not found");
  });

  it("returns booking by id", async () => {
    const db = getTestDb();
    await seedBookingDeps(db);
    await seedBooking(db, "bk-1");

    const result = await getBooking(db, "bk-1");
    expect(result.id).toBe("bk-1");
    expect(result.petId).toBe("pet-1");
    expect(result.bookingStatus).toBe("pending");
    expect(result.price).toBe(2500);
  });
});

describe("createBooking", () => {
  it("creates a booking with required fields", async () => {
    const db = getTestDb();
    await seedBookingDeps(db);

    const result = await createBooking(db, {
      petId: "pet-1",
      flightId: "fl-1",
      clientId: "cl-1",
      humanId: "h-1",
      price: 3000,
    });

    expect(result.id).toBeDefined();
    expect(result.bookingStatus).toBe("pending");
    expect(result.specialInstructions).toBeNull();
    expect(result.confirmationR2Key).toBeNull();

    const rows = await db.select().from(schema.flightBookings);
    expect(rows).toHaveLength(1);
  });

  it("creates a booking with special instructions", async () => {
    const db = getTestDb();
    await seedBookingDeps(db);

    const result = await createBooking(db, {
      petId: "pet-1",
      flightId: "fl-1",
      clientId: "cl-1",
      humanId: "h-1",
      price: 3000,
      specialInstructions: "Keep pet warm",
    });

    expect(result.specialInstructions).toBe("Keep pet warm");
  });
});

describe("updateBooking", () => {
  it("throws not found for missing booking", async () => {
    const db = getTestDb();
    await expect(
      updateBooking(db, "nonexistent", { bookingStatus: "confirmed" }),
    ).rejects.toThrowError("Booking not found");
  });

  it("updates booking fields", async () => {
    const db = getTestDb();
    await seedBookingDeps(db);
    await seedBooking(db, "bk-1");

    const result = await updateBooking(db, "bk-1", {
      bookingStatus: "confirmed",
      price: 3500,
    });

    expect(result!.bookingStatus).toBe("confirmed");
    expect(result!.price).toBe(3500);
    expect(result!.updatedAt).toBeDefined();
  });
});
