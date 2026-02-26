import { describe, it, expect } from "vitest";
import { createEmailSchema, updateEmailSchema } from "./emails";

describe("createEmailSchema", () => {
  const validInput = { humanId: "h-1", email: "test@example.com" };

  it("accepts valid input with humanId", () => {
    const result = createEmailSchema.parse(validInput);
    expect(result.humanId).toBe("h-1");
    expect(result.email).toBe("test@example.com");
    expect(result.isPrimary).toBe(false);
  });

  it("accepts valid input with accountId", () => {
    const result = createEmailSchema.parse({ accountId: "a-1", email: "test@example.com" });
    expect(result.accountId).toBe("a-1");
    expect(result.email).toBe("test@example.com");
  });

  it("accepts valid input with generalLeadId", () => {
    const result = createEmailSchema.parse({ generalLeadId: "gl-1", email: "test@example.com" });
    expect(result.generalLeadId).toBe("gl-1");
  });

  it("accepts valid input with websiteBookingRequestId", () => {
    const result = createEmailSchema.parse({ websiteBookingRequestId: "wbr-1", email: "test@example.com" });
    expect(result.websiteBookingRequestId).toBe("wbr-1");
  });

  it("accepts valid input with routeSignupId", () => {
    const result = createEmailSchema.parse({ routeSignupId: "rs-1", email: "test@example.com" });
    expect(result.routeSignupId).toBe("rs-1");
  });

  it("accepts multiple entity IDs simultaneously", () => {
    const result = createEmailSchema.parse({ humanId: "h-1", generalLeadId: "gl-1", email: "test@example.com" });
    expect(result.humanId).toBe("h-1");
    expect(result.generalLeadId).toBe("gl-1");
  });

  it("rejects when no entity ID is provided", () => {
    expect(() => createEmailSchema.parse({ email: "test@example.com" })).toThrowError();
  });

  it("accepts optional fields", () => {
    const result = createEmailSchema.parse({ ...validInput, labelId: "lbl-1", isPrimary: true });
    expect(result.labelId).toBe("lbl-1");
    expect(result.isPrimary).toBe(true);
  });

  it("rejects invalid email format", () => {
    expect(() => createEmailSchema.parse({ ...validInput, email: "not-an-email" })).toThrowError();
  });

  it("rejects email over 255 chars", () => {
    expect(() => createEmailSchema.parse({ ...validInput, email: "a".repeat(250) + "@b.com" })).toThrowError();
  });
});

describe("updateEmailSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updateEmailSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial email update", () => {
    const result = updateEmailSchema.parse({ email: "new@example.com" });
    expect(result.email).toBe("new@example.com");
  });

  it("accepts isPrimary update", () => {
    const result = updateEmailSchema.parse({ isPrimary: true });
    expect(result.isPrimary).toBe(true);
  });

  it("accepts labelId: null to clear a label", () => {
    const result = updateEmailSchema.parse({ labelId: null });
    expect(result.labelId).toBeNull();
  });

  it("accepts nullable entity ID fields", () => {
    const result = updateEmailSchema.parse({ humanId: null, accountId: "a-1" });
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBe("a-1");
  });
});
