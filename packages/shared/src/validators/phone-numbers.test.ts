import { describe, it, expect } from "vitest";
import { createPhoneNumberSchema, updatePhoneNumberSchema } from "./phone-numbers";

describe("createPhoneNumberSchema", () => {
  const validInput = { humanId: "h-1", phoneNumber: "+1234567890" };

  it("accepts valid input with humanId", () => {
    const result = createPhoneNumberSchema.parse(validInput);
    expect(result.humanId).toBe("h-1");
    expect(result.phoneNumber).toBe("+1234567890");
    expect(result.hasWhatsapp).toBe(false);
    expect(result.isPrimary).toBe(false);
  });

  it("accepts valid input with accountId", () => {
    const result = createPhoneNumberSchema.parse({ accountId: "a-1", phoneNumber: "+1234567890" });
    expect(result.accountId).toBe("a-1");
  });

  it("accepts valid input with generalLeadId", () => {
    const result = createPhoneNumberSchema.parse({ generalLeadId: "gl-1", phoneNumber: "+1234567890" });
    expect(result.generalLeadId).toBe("gl-1");
  });

  it("accepts valid input with websiteBookingRequestId", () => {
    const result = createPhoneNumberSchema.parse({ websiteBookingRequestId: "wbr-1", phoneNumber: "+1234567890" });
    expect(result.websiteBookingRequestId).toBe("wbr-1");
  });

  it("accepts valid input with routeSignupId", () => {
    const result = createPhoneNumberSchema.parse({ routeSignupId: "rs-1", phoneNumber: "+1234567890" });
    expect(result.routeSignupId).toBe("rs-1");
  });

  it("accepts multiple entity IDs simultaneously", () => {
    const result = createPhoneNumberSchema.parse({ humanId: "h-1", generalLeadId: "gl-1", phoneNumber: "+1234567890" });
    expect(result.humanId).toBe("h-1");
    expect(result.generalLeadId).toBe("gl-1");
  });

  it("rejects when no entity ID is provided", () => {
    expect(() => createPhoneNumberSchema.parse({ phoneNumber: "+1234567890" })).toThrowError();
  });

  it("accepts optional fields", () => {
    const result = createPhoneNumberSchema.parse({
      ...validInput,
      labelId: "lbl-1",
      hasWhatsapp: true,
      isPrimary: true,
    });
    expect(result.labelId).toBe("lbl-1");
    expect(result.hasWhatsapp).toBe(true);
    expect(result.isPrimary).toBe(true);
  });

  it("rejects empty phoneNumber", () => {
    expect(() => createPhoneNumberSchema.parse({ ...validInput, phoneNumber: "" })).toThrowError();
  });

  it("rejects phoneNumber over 50 chars", () => {
    expect(() => createPhoneNumberSchema.parse({ ...validInput, phoneNumber: "1".repeat(51) })).toThrowError();
  });

  it("rejects phoneNumber with script injection", () => {
    expect(() => createPhoneNumberSchema.parse({ humanId: "h-1", phoneNumber: "<script>alert(1)</script>" })).toThrowError();
  });

  it("accepts phoneNumber with valid characters", () => {
    const result = createPhoneNumberSchema.parse({ humanId: "h-1", phoneNumber: "+1 (555) 123-4567" });
    expect(result.phoneNumber).toBe("+1 (555) 123-4567");
  });
});

describe("updatePhoneNumberSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updatePhoneNumberSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial update", () => {
    const result = updatePhoneNumberSchema.parse({ phoneNumber: "+9876543210" });
    expect(result.phoneNumber).toBe("+9876543210");
  });

  it("accepts labelId: null to clear a label", () => {
    const result = updatePhoneNumberSchema.parse({ labelId: null });
    expect(result.labelId).toBeNull();
  });

  it("accepts nullable entity ID fields", () => {
    const result = updatePhoneNumberSchema.parse({ humanId: null, accountId: "a-1" });
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBe("a-1");
  });
});
