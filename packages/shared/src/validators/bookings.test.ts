import { describe, it, expect } from "vitest";
import { createBookingSchema, updateBookingSchema } from "./bookings";

describe("createBookingSchema", () => {
  const validInput = {
    flightId: "f-1",
    clientId: "c-1",
    petId: "p-1",
    price: 500,
  };

  it("accepts valid input", () => {
    const result = createBookingSchema.parse(validInput);
    expect(result.flightId).toBe("f-1");
    expect(result.price).toBe(500);
  });

  it("accepts optional specialInstructions", () => {
    const result = createBookingSchema.parse({ ...validInput, specialInstructions: "Handle with care" });
    expect(result.specialInstructions).toBe("Handle with care");
  });

  it("accepts price of 0 (nonnegative)", () => {
    const result = createBookingSchema.parse({ ...validInput, price: 0 });
    expect(result.price).toBe(0);
  });

  it("rejects negative price", () => {
    expect(() => createBookingSchema.parse({ ...validInput, price: -1 })).toThrowError();
  });

  it("rejects non-integer price", () => {
    expect(() => createBookingSchema.parse({ ...validInput, price: 9.99 })).toThrowError();
  });

  it("rejects empty flightId", () => {
    expect(() => createBookingSchema.parse({ ...validInput, flightId: "" })).toThrowError();
  });

  it("rejects empty clientId", () => {
    expect(() => createBookingSchema.parse({ ...validInput, clientId: "" })).toThrowError();
  });

  it("rejects empty petId", () => {
    expect(() => createBookingSchema.parse({ ...validInput, petId: "" })).toThrowError();
  });

  it("rejects specialInstructions over 2000 chars", () => {
    expect(() => createBookingSchema.parse({ ...validInput, specialInstructions: "a".repeat(2001) })).toThrowError();
  });
});

describe("updateBookingSchema", () => {
  it("accepts empty object", () => {
    expect(updateBookingSchema.parse({})).toStrictEqual({});
  });

  it("accepts valid bookingStatus values", () => {
    for (const status of ["pending", "confirmed", "checked_in", "completed", "cancelled"] as const) {
      expect(updateBookingSchema.parse({ bookingStatus: status }).bookingStatus).toBe(status);
    }
  });

  it("rejects invalid bookingStatus", () => {
    expect(() => updateBookingSchema.parse({ bookingStatus: "invalid" })).toThrowError();
  });

  it("accepts price update", () => {
    const result = updateBookingSchema.parse({ price: 1000 });
    expect(result.price).toBe(1000);
  });
});
