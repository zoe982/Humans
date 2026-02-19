import { describe, it, expect } from "vitest";
import { createColleagueSchema, updateColleagueSchema } from "./colleagues";

describe("createColleagueSchema", () => {
  const validInput = {
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    role: "agent" as const,
  };

  it("accepts valid input", () => {
    const result = createColleagueSchema.parse(validInput);
    expect(result.email).toBe("alice@example.com");
    expect(result.role).toBe("agent");
  });

  it("accepts optional middleNames", () => {
    const result = createColleagueSchema.parse({ ...validInput, middleNames: "Marie Anne" });
    expect(result.middleNames).toBe("Marie Anne");
  });

  it("accepts all valid roles", () => {
    for (const role of ["admin", "manager", "agent", "viewer"] as const) {
      expect(createColleagueSchema.parse({ ...validInput, role }).role).toBe(role);
    }
  });

  it("rejects invalid email", () => {
    expect(() => createColleagueSchema.parse({ ...validInput, email: "bad" })).toThrowError();
  });

  it("rejects empty firstName", () => {
    expect(() => createColleagueSchema.parse({ ...validInput, firstName: "" })).toThrowError();
  });

  it("rejects empty lastName", () => {
    expect(() => createColleagueSchema.parse({ ...validInput, lastName: "" })).toThrowError();
  });

  it("rejects invalid role", () => {
    expect(() => createColleagueSchema.parse({ ...validInput, role: "superadmin" })).toThrowError();
  });

  it("rejects email over 255 chars", () => {
    expect(() => createColleagueSchema.parse({ ...validInput, email: "a".repeat(250) + "@b.com" })).toThrowError();
  });

  it("rejects middleNames over 200 chars", () => {
    expect(() => createColleagueSchema.parse({ ...validInput, middleNames: "a".repeat(201) })).toThrowError();
  });
});

describe("updateColleagueSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateColleagueSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial updates", () => {
    const result = updateColleagueSchema.parse({ firstName: "Bob", role: "manager" });
    expect(result.firstName).toBe("Bob");
    expect(result.role).toBe("manager");
  });

  it("allows nullable middleNames", () => {
    const result = updateColleagueSchema.parse({ middleNames: null });
    expect(result.middleNames).toBeNull();
  });

  it("accepts isActive boolean", () => {
    const result = updateColleagueSchema.parse({ isActive: false });
    expect(result.isActive).toBe(false);
  });
});
