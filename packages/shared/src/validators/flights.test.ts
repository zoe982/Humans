import { describe, it, expect } from "vitest";
import { createFlightSchema, updateFlightSchema } from "./flights";

describe("createFlightSchema", () => {
  const validInput = {
    flightNumber: "BA123",
    departureAirport: "LHR",
    arrivalAirport: "JFK",
    departureDate: "2024-06-15T10:00:00.000Z",
    arrivalDate: "2024-06-15T18:00:00.000Z",
    airline: "British Airways",
    maxPets: 3,
  };

  it("accepts valid input", () => {
    const result = createFlightSchema.parse(validInput);
    expect(result.flightNumber).toBe("BA123");
    expect(result.airline).toBe("British Airways");
  });

  it("accepts optional cabinClass and status", () => {
    const result = createFlightSchema.parse({ ...validInput, cabinClass: "Business", status: "confirmed" });
    expect(result.cabinClass).toBe("Business");
    expect(result.status).toBe("confirmed");
  });

  it("accepts all valid status values", () => {
    for (const status of ["scheduled", "confirmed", "in_transit", "completed", "cancelled"] as const) {
      expect(createFlightSchema.parse({ ...validInput, status }).status).toBe(status);
    }
  });

  it("rejects empty flightNumber", () => {
    expect(() => createFlightSchema.parse({ ...validInput, flightNumber: "" })).toThrowError();
  });

  it("rejects departureAirport under 3 chars", () => {
    expect(() => createFlightSchema.parse({ ...validInput, departureAirport: "LH" })).toThrowError();
  });

  it("rejects arrivalAirport over 10 chars", () => {
    expect(() => createFlightSchema.parse({ ...validInput, arrivalAirport: "a".repeat(11) })).toThrowError();
  });

  it("rejects invalid datetime", () => {
    expect(() => createFlightSchema.parse({ ...validInput, departureDate: "not-a-date" })).toThrowError();
  });

  it("rejects non-positive maxPets", () => {
    expect(() => createFlightSchema.parse({ ...validInput, maxPets: 0 })).toThrowError();
  });

  it("rejects non-integer maxPets", () => {
    expect(() => createFlightSchema.parse({ ...validInput, maxPets: 2.5 })).toThrowError();
  });

  it("rejects empty airline", () => {
    expect(() => createFlightSchema.parse({ ...validInput, airline: "" })).toThrowError();
  });

  it("rejects invalid status", () => {
    expect(() => createFlightSchema.parse({ ...validInput, status: "delayed" })).toThrowError();
  });
});

describe("updateFlightSchema", () => {
  it("accepts empty object (all partial)", () => {
    expect(updateFlightSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial update", () => {
    const result = updateFlightSchema.parse({ status: "cancelled" });
    expect(result.status).toBe("cancelled");
  });
});
