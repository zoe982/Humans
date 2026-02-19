import { describe, it, expect } from "vitest";
import {
  createHumanSchema,
  updateHumanSchema,
  updateHumanStatusSchema,
  linkRouteSignupSchema,
  humanTypeEnum,
  humanStatusEnum,
} from "./humans";

describe("humanTypeEnum", () => {
  it("accepts valid human types", () => {
    expect(humanTypeEnum.parse("client")).toBe("client");
    expect(humanTypeEnum.parse("trainer")).toBe("trainer");
    expect(humanTypeEnum.parse("travel_agent")).toBe("travel_agent");
    expect(humanTypeEnum.parse("flight_broker")).toBe("flight_broker");
  });

  it("rejects invalid type", () => {
    expect(() => humanTypeEnum.parse("invalid")).toThrowError();
  });
});

describe("humanStatusEnum", () => {
  it("accepts valid statuses", () => {
    expect(humanStatusEnum.parse("open")).toBe("open");
    expect(humanStatusEnum.parse("active")).toBe("active");
    expect(humanStatusEnum.parse("closed")).toBe("closed");
  });

  it("rejects invalid status", () => {
    expect(() => humanStatusEnum.parse("deleted")).toThrowError();
  });
});

describe("createHumanSchema", () => {
  const validInput = {
    firstName: "Jane",
    lastName: "Doe",
    emails: [{ email: "jane@example.com" }],
    types: ["client" as const],
  };

  it("accepts valid input", () => {
    const result = createHumanSchema.parse(validInput);
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.status).toBe("open");
  });

  it("accepts optional middleName", () => {
    const result = createHumanSchema.parse({ ...validInput, middleName: "Marie" });
    expect(result.middleName).toBe("Marie");
  });

  it("defaults status to open", () => {
    const result = createHumanSchema.parse(validInput);
    expect(result.status).toBe("open");
  });

  it("allows explicit status", () => {
    const result = createHumanSchema.parse({ ...validInput, status: "active" });
    expect(result.status).toBe("active");
  });

  it("rejects empty firstName", () => {
    expect(() => createHumanSchema.parse({ ...validInput, firstName: "" })).toThrowError();
  });

  it("rejects firstName over 100 chars", () => {
    expect(() => createHumanSchema.parse({ ...validInput, firstName: "a".repeat(101) })).toThrowError();
  });

  it("rejects empty lastName", () => {
    expect(() => createHumanSchema.parse({ ...validInput, lastName: "" })).toThrowError();
  });

  it("rejects empty emails array", () => {
    expect(() => createHumanSchema.parse({ ...validInput, emails: [] })).toThrowError();
  });

  it("rejects empty types array", () => {
    expect(() => createHumanSchema.parse({ ...validInput, types: [] })).toThrowError();
  });

  it("rejects invalid email format", () => {
    expect(() => createHumanSchema.parse({ ...validInput, emails: [{ email: "not-an-email" }] })).toThrowError();
  });

  it("accepts email with labelId and isPrimary", () => {
    const result = createHumanSchema.parse({
      ...validInput,
      emails: [{ email: "jane@example.com", labelId: "lbl-1", isPrimary: true }],
    });
    expect(result.emails[0].isPrimary).toBe(true);
    expect(result.emails[0].labelId).toBe("lbl-1");
  });

  it("defaults isPrimary to false on emails", () => {
    const result = createHumanSchema.parse(validInput);
    expect(result.emails[0].isPrimary).toBe(false);
  });

  it("rejects invalid type in types array", () => {
    expect(() => createHumanSchema.parse({ ...validInput, types: ["invalid"] })).toThrowError();
  });

  it("accepts multiple types", () => {
    const result = createHumanSchema.parse({ ...validInput, types: ["client", "trainer"] });
    expect(result.types).toHaveLength(2);
  });
});

describe("updateHumanSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateHumanSchema.parse({});
    expect(result).toStrictEqual({});
  });

  it("accepts partial updates", () => {
    const result = updateHumanSchema.parse({ firstName: "John" });
    expect(result.firstName).toBe("John");
  });

  it("allows nullable middleName", () => {
    const result = updateHumanSchema.parse({ middleName: null });
    expect(result.middleName).toBeNull();
  });

  it("rejects empty firstName when provided", () => {
    expect(() => updateHumanSchema.parse({ firstName: "" })).toThrowError();
  });

  it("accepts status change", () => {
    const result = updateHumanSchema.parse({ status: "closed" });
    expect(result.status).toBe("closed");
  });
});

describe("updateHumanStatusSchema", () => {
  it("accepts valid status", () => {
    const result = updateHumanStatusSchema.parse({ status: "active" });
    expect(result.status).toBe("active");
  });

  it("rejects missing status", () => {
    expect(() => updateHumanStatusSchema.parse({})).toThrowError();
  });

  it("rejects invalid status", () => {
    expect(() => updateHumanStatusSchema.parse({ status: "archived" })).toThrowError();
  });
});

describe("linkRouteSignupSchema", () => {
  it("accepts valid UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = linkRouteSignupSchema.parse({ routeSignupId: uuid });
    expect(result.routeSignupId).toBe(uuid);
  });

  it("rejects non-UUID string", () => {
    expect(() => linkRouteSignupSchema.parse({ routeSignupId: "not-a-uuid" })).toThrowError();
  });

  it("rejects missing routeSignupId", () => {
    expect(() => linkRouteSignupSchema.parse({})).toThrowError();
  });
});
