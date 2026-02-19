/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildClient, buildPet, buildFlight } from "@humans/test-utils";

async function createBookingFixtures() {
  const db = getDb();
  const client = buildClient({ email: `booking-client-${Date.now()}@test.com` });
  const pet = buildPet({ clientId: client.id });
  const flight = buildFlight();
  await db.insert(schema.clients).values(client);
  await db.insert(schema.pets).values(pet);
  await db.insert(schema.flights).values(flight);
  return { client, pet, flight };
}

describe("GET /api/bookings", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/bookings");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no bookings exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/bookings", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });
});

describe("GET /api/bookings/:id", () => {
  it("returns 404 for non-existent booking", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/bookings/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });
});

describe("POST /api/bookings", () => {
  it("returns 403 for viewer role", async () => {
    const { client, pet, flight } = await createBookingFixtures();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ flightId: flight.id, clientId: client.id, petId: pet.id, price: 500 }),
    });
    expect(res.status).toBe(403);
  });

  it("creates booking and returns 201", async () => {
    const { client, pet, flight } = await createBookingFixtures();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ flightId: flight.id, clientId: client.id, petId: pet.id, price: 50000 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { bookingStatus: string; price: number } };
    expect(body.data.bookingStatus).toBe("pending");
    expect(body.data.price).toBe(50000);
  });

  it("returns 400 for invalid data", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ price: -1 }), // negative price, missing required fields
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/bookings/:id", () => {
  it("returns 404 for non-existent booking", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/bookings/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ bookingStatus: "confirmed" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates booking status", async () => {
    const { client, pet, flight } = await createBookingFixtures();
    const db = getDb();
    const { createId } = await import("@humans/db");
    const now = new Date().toISOString();
    const bookingId = createId();
    await db.insert(schema.flightBookings).values({
      id: bookingId,
      flightId: flight.id,
      clientId: client.id,
      petId: pet.id,
      bookingStatus: "pending",
      price: 30000,
      confirmationR2Key: null,
      specialInstructions: null,
      createdAt: now,
      updatedAt: now,
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ bookingStatus: "confirmed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { bookingStatus: string } };
    expect(body.data.bookingStatus).toBe("confirmed");
  });
});
