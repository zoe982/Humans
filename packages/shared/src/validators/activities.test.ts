import { describe, it, expect } from "vitest";
import { createActivitySchema, updateActivitySchema, activityTypes } from "./activities";

describe("activityTypes", () => {
  it("contains expected types", () => {
    expect(activityTypes).toContain("email");
    expect(activityTypes).toContain("whatsapp_message");
    expect(activityTypes).toContain("online_meeting");
    expect(activityTypes).toContain("phone_call");
  });

  it("has exactly 5 types", () => {
    expect(activityTypes).toHaveLength(5);
    expect(activityTypes).toContain("social_message");
  });
});

describe("createActivitySchema", () => {
  const validBase = {
    subject: "Test email",
    activityDate: "2024-01-15T10:00:00.000Z",
    humanId: "h-1",
  };

  it("accepts valid email activity", () => {
    const result = createActivitySchema.parse(validBase);
    expect(result.type).toBe("email");
    expect(result.subject).toBe("Test email");
  });

  it("defaults type to email", () => {
    const result = createActivitySchema.parse(validBase);
    expect(result.type).toBe("email");
  });

  it("accepts explicit type", () => {
    const result = createActivitySchema.parse({ ...validBase, type: "phone_call" });
    expect(result.type).toBe("phone_call");
  });

  it("requires subject for email type", () => {
    const input = { activityDate: "2024-01-15T10:00:00.000Z", humanId: "h-1" };
    expect(() => createActivitySchema.parse(input)).toThrowError();
  });

  it("requires subject to be non-empty for email type", () => {
    const input = { ...validBase, subject: "  " };
    expect(() => createActivitySchema.parse(input)).toThrowError();
  });

  it("does not require subject for non-email types", () => {
    const input = { type: "phone_call" as const, activityDate: "2024-01-15T10:00:00.000Z", humanId: "h-1" };
    const result = createActivitySchema.parse(input);
    expect(result.type).toBe("phone_call");
  });

  it("requires at least one of humanId, accountId, or routeSignupId", () => {
    const input = { subject: "Test", activityDate: "2024-01-15T10:00:00.000Z" };
    expect(() => createActivitySchema.parse(input)).toThrowError();
  });

  it("accepts accountId instead of humanId", () => {
    const result = createActivitySchema.parse({
      subject: "Test email",
      activityDate: "2024-01-15T10:00:00.000Z",
      accountId: "acc-1",
    });
    expect(result.accountId).toBe("acc-1");
  });

  it("accepts routeSignupId as UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const result = createActivitySchema.parse({
      subject: "Test email",
      activityDate: "2024-01-15T10:00:00.000Z",
      routeSignupId: uuid,
    });
    expect(result.routeSignupId).toBe(uuid);
  });

  it("rejects invalid datetime format", () => {
    expect(() => createActivitySchema.parse({ ...validBase, activityDate: "not-a-date" })).toThrowError();
  });

  it("accepts optional notes", () => {
    const result = createActivitySchema.parse({ ...validBase, notes: "some notes" });
    expect(result.notes).toBe("some notes");
  });

  it("rejects notes over 10000 chars", () => {
    expect(() => createActivitySchema.parse({ ...validBase, notes: "a".repeat(10001) })).toThrowError();
  });

  it("accepts optional gmailId and frontId", () => {
    const result = createActivitySchema.parse({ ...validBase, gmailId: "g-1", frontId: "f-1" });
    expect(result.gmailId).toBe("g-1");
    expect(result.frontId).toBe("f-1");
  });
});

describe("updateActivitySchema", () => {
  it("accepts empty object", () => {
    expect(updateActivitySchema.parse({})).toStrictEqual({});
  });

  it("accepts partial type update", () => {
    const result = updateActivitySchema.parse({ type: "phone_call" });
    expect(result.type).toBe("phone_call");
  });

  it("accepts partial subject update", () => {
    const result = updateActivitySchema.parse({ subject: "Updated" });
    expect(result.subject).toBe("Updated");
  });

  it("rejects empty subject when provided", () => {
    expect(() => updateActivitySchema.parse({ subject: "" })).toThrowError();
  });

  it("rejects subject over 500 chars", () => {
    expect(() => updateActivitySchema.parse({ subject: "a".repeat(501) })).toThrowError();
  });
});
