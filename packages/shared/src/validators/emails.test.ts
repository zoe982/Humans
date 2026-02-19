import { describe, it, expect } from "vitest";
import { createEmailSchema, updateEmailSchema } from "./emails";

describe("createEmailSchema", () => {
  const validInput = { humanId: "h-1", email: "test@example.com" };

  it("accepts valid input", () => {
    const result = createEmailSchema.parse(validInput);
    expect(result.humanId).toBe("h-1");
    expect(result.email).toBe("test@example.com");
    expect(result.isPrimary).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createEmailSchema.parse({ ...validInput, labelId: "lbl-1", isPrimary: true });
    expect(result.labelId).toBe("lbl-1");
    expect(result.isPrimary).toBe(true);
  });

  it("rejects empty humanId", () => {
    expect(() => createEmailSchema.parse({ ...validInput, humanId: "" })).toThrowError();
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

  it("does not include humanId (omitted from update)", () => {
    const result = updateEmailSchema.parse({});
    expect(result).not.toHaveProperty("humanId");
  });

  it("accepts isPrimary update", () => {
    const result = updateEmailSchema.parse({ isPrimary: true });
    expect(result.isPrimary).toBe(true);
  });
});
