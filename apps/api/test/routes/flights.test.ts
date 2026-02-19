/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildFlight } from "@humans/test-utils";

const validFlight = {
  flightNumber: "PAV-001",
  departureAirport: "LAX",
  arrivalAirport: "JFK",
  departureDate: "2026-06-01T08:00:00.000Z",
  arrivalDate: "2026-06-01T16:00:00.000Z",
  airline: "Pet Air Valet",
  maxPets: 4,
};

describe("GET /api/flights", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/flights");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no flights exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/flights", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of flights", async () => {
    const db = getDb();
    await db.insert(schema.flights).values([buildFlight(), buildFlight()]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/flights", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(2);
  });
});

describe("GET /api/flights/:id", () => {
  it("returns 404 for non-existent flight", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/flights/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns flight by id", async () => {
    const db = getDb();
    const flight = buildFlight();
    await db.insert(schema.flights).values(flight);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`http://localhost/api/flights/${flight.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe(flight.id);
  });
});

describe("POST /api/flights", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify(validFlight),
    });
    expect(res.status).toBe(403);
  });

  it("creates flight and returns 201", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify(validFlight),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { flightNumber: string } };
    expect(body.data.flightNumber).toBe("PAV-001");
  });

  it("returns 400 for invalid data", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ flightNumber: "X" }), // missing required fields
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/flights/:id", () => {
  it("returns 404 for non-existent flight", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/flights/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "confirmed" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates flight status", async () => {
    const db = getDb();
    const flight = buildFlight({ status: "scheduled" });
    await db.insert(schema.flights).values(flight);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/flights/${flight.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ status: "confirmed" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe("confirmed");
  });
});
