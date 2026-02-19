import { describe, it, expect } from "vitest";
import { createPhoneNumberSchema, updatePhoneNumberSchema } from "./phone-numbers";

describe("createPhoneNumberSchema", () => {
  const validInput = { humanId: "h-1", phoneNumber: "+1234567890" };

  it("accepts valid input", () => {
    const result = createPhoneNumberSchema.parse(validInput);
    expect(result.humanId).toBe("h-1");
    expect(result.phoneNumber).toBe("+1234567890");
    expect(result.hasWhatsapp).toBe(false);
    expect(result.isPrimary).toBe(false);
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

  it("rejects empty humanId", () => {
    expect(() => createPhoneNumberSchema.parse({ ...validInput, humanId: "" })).toThrowError();
  });

  it("rejects empty phoneNumber", () => {
    expect(() => createPhoneNumberSchema.parse({ ...validInput, phoneNumber: "" })).toThrowError();
  });

  it("rejects phoneNumber over 50 chars", () => {
    expect(() => createPhoneNumberSchema.parse({ ...validInput, phoneNumber: "1".repeat(51) })).toThrowError();
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

  it("does not include humanId (omitted from update)", () => {
    const result = updatePhoneNumberSchema.parse({});
    expect(result).not.toHaveProperty("humanId");
  });
});
