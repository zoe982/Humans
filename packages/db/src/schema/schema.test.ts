import { describe, it, expect } from "vitest";
import { getTableName } from "drizzle-orm";
import { colleagues, roles } from "./colleagues";
import { clients, clientStatuses } from "./clients";
import { pets } from "./pets";
import { flights, flightStatuses } from "./flights";
import { flightBookings, bookingStatuses } from "./flight-bookings";
import { leadSources, leadSourceCategories } from "./lead-sources";
import { leadEvents, leadEventTypes } from "./lead-events";
import { auditLog } from "./audit-log";

describe("schema tables", () => {
  it("colleagues table has correct name", () => {
    expect(getTableName(colleagues)).toBe("colleagues");
  });

  it("clients table has correct name", () => {
    expect(getTableName(clients)).toBe("clients");
  });

  it("pets table has correct name", () => {
    expect(getTableName(pets)).toBe("pets");
  });

  it("flights table has correct name", () => {
    expect(getTableName(flights)).toBe("flights");
  });

  it("flightBookings table has correct name", () => {
    expect(getTableName(flightBookings)).toBe("flight_bookings");
  });

  it("leadSources table has correct name", () => {
    expect(getTableName(leadSources)).toBe("lead_sources");
  });

  it("leadEvents table has correct name", () => {
    expect(getTableName(leadEvents)).toBe("lead_events");
  });

  it("auditLog table has correct name", () => {
    expect(getTableName(auditLog)).toBe("audit_log");
  });
});

describe("enum constants", () => {
  it("roles contains expected values", () => {
    expect(roles).toEqual(["admin", "manager", "agent", "viewer"]);
  });

  it("clientStatuses contains expected values", () => {
    expect(clientStatuses).toEqual(["active", "inactive", "prospect"]);
  });

  it("flightStatuses contains expected values", () => {
    expect(flightStatuses).toEqual([
      "scheduled",
      "confirmed",
      "in_transit",
      "completed",
      "cancelled",
    ]);
  });

  it("bookingStatuses contains expected values", () => {
    expect(bookingStatuses).toEqual([
      "pending",
      "confirmed",
      "checked_in",
      "completed",
      "cancelled",
    ]);
  });

  it("leadSourceCategories contains expected values", () => {
    expect(leadSourceCategories).toEqual([
      "paid",
      "organic",
      "referral",
      "direct",
      "event",
    ]);
  });

  it("leadEventTypes contains expected values", () => {
    expect(leadEventTypes).toEqual([
      "inquiry",
      "quote_requested",
      "quote_sent",
      "follow_up",
      "booking",
      "conversion",
      "lost",
    ]);
  });
});

describe("schema index re-exports", () => {
  it("re-exports all tables and constants", async () => {
    const schemaIndex = await import("./index");
    expect(schemaIndex.colleagues).toBeDefined();
    expect(schemaIndex.clients).toBeDefined();
    expect(schemaIndex.pets).toBeDefined();
    expect(schemaIndex.flights).toBeDefined();
    expect(schemaIndex.flightBookings).toBeDefined();
    expect(schemaIndex.leadSources).toBeDefined();
    expect(schemaIndex.leadEvents).toBeDefined();
    expect(schemaIndex.auditLog).toBeDefined();
    expect(schemaIndex.roles).toBeDefined();
    expect(schemaIndex.clientStatuses).toBeDefined();
    expect(schemaIndex.flightStatuses).toBeDefined();
    expect(schemaIndex.bookingStatuses).toBeDefined();
    expect(schemaIndex.leadSourceCategories).toBeDefined();
    expect(schemaIndex.leadEventTypes).toBeDefined();
  });
});
