import { describe, it, expect } from "vitest";
import { createClientSchema, updateClientSchema, addressSchema } from "./clients";

describe("addressSchema", () => {
  it("accepts empty object", () => {
    expect(addressSchema.parse({})).toStrictEqual({});
  });

  it("accepts all address fields", () => {
    const addr = { street: "123 Main St", city: "NYC", state: "NY", zip: "10001", country: "US" };
    expect(addressSchema.parse(addr)).toStrictEqual(addr);
  });

  it("accepts partial address", () => {
    const result = addressSchema.parse({ city: "London" });
    expect(result.city).toBe("London");
  });
});

describe("createClientSchema", () => {
  const validInput = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
  };

  it("accepts valid minimal input", () => {
    const result = createClientSchema.parse(validInput);
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.email).toBe("john@example.com");
  });

  it("accepts all optional fields", () => {
    const full = {
      ...validInput,
      phone: "+1234567890",
      address: { street: "123 Main", city: "NYC" },
      status: "active" as const,
      notes: "VIP client",
      leadSourceId: "ls-1",
      assignedToUserId: "u-1",
    };
    const result = createClientSchema.parse(full);
    expect(result.status).toBe("active");
    expect(result.notes).toBe("VIP client");
  });

  it("rejects empty firstName", () => {
    expect(() => createClientSchema.parse({ ...validInput, firstName: "" })).toThrowError();
  });

  it("rejects empty lastName", () => {
    expect(() => createClientSchema.parse({ ...validInput, lastName: "" })).toThrowError();
  });

  it("rejects invalid email", () => {
    expect(() => createClientSchema.parse({ ...validInput, email: "bad" })).toThrowError();
  });

  it("rejects invalid status value", () => {
    expect(() => createClientSchema.parse({ ...validInput, status: "deleted" })).toThrowError();
  });

  it("accepts prospect status", () => {
    const result = createClientSchema.parse({ ...validInput, status: "prospect" });
    expect(result.status).toBe("prospect");
  });

  it("rejects notes over 5000 chars", () => {
    expect(() => createClientSchema.parse({ ...validInput, notes: "a".repeat(5001) })).toThrowError();
  });

  it("rejects firstName over 100 chars", () => {
    expect(() => createClientSchema.parse({ ...validInput, firstName: "a".repeat(101) })).toThrowError();
  });
});

describe("updateClientSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateClientSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial updates", () => {
    const result = updateClientSchema.parse({ firstName: "Jane", status: "inactive" });
    expect(result.firstName).toBe("Jane");
    expect(result.status).toBe("inactive");
  });
});
