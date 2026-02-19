import { describe, it, expect } from "vitest";
import { createId, colleagues, clients, pets, flights, flightBookings, leadSources, leadEvents, auditLog } from "./index";

describe("package root exports", () => {
  it("exports createId", () => {
    expect(typeof createId).toBe("function");
  });

  it("exports all schema tables", () => {
    expect(colleagues).toBeDefined();
    expect(clients).toBeDefined();
    expect(pets).toBeDefined();
    expect(flights).toBeDefined();
    expect(flightBookings).toBeDefined();
    expect(leadSources).toBeDefined();
    expect(leadEvents).toBeDefined();
    expect(auditLog).toBeDefined();
  });
});
