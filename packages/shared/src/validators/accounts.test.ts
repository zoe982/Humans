import { describe, it, expect } from "vitest";
import {
  createAccountSchema,
  updateAccountSchema,
  updateAccountStatusSchema,
  accountStatusEnum,
  createAccountEmailSchema,
  updateAccountEmailSchema,
  createAccountPhoneNumberSchema,
  updateAccountPhoneNumberSchema,
  linkAccountHumanSchema,
  updateAccountHumanSchema,
  createConfigItemSchema,
  updateConfigItemSchema,
} from "./accounts";

describe("accountStatusEnum", () => {
  it("accepts valid statuses", () => {
    expect(accountStatusEnum.parse("open")).toBe("open");
    expect(accountStatusEnum.parse("active")).toBe("active");
    expect(accountStatusEnum.parse("closed")).toBe("closed");
  });

  it("rejects invalid status", () => {
    expect(() => accountStatusEnum.parse("archived")).toThrowError();
  });
});

describe("createAccountSchema", () => {
  it("accepts valid input with defaults", () => {
    const result = createAccountSchema.parse({ name: "Acme Corp" });
    expect(result.name).toBe("Acme Corp");
    expect(result.status).toBe("open");
  });

  it("accepts explicit status", () => {
    const result = createAccountSchema.parse({ name: "Acme", status: "active" });
    expect(result.status).toBe("active");
  });

  it("accepts optional typeIds", () => {
    const result = createAccountSchema.parse({ name: "Acme", typeIds: ["t1", "t2"] });
    expect(result.typeIds).toStrictEqual(["t1", "t2"]);
  });

  it("rejects empty name", () => {
    expect(() => createAccountSchema.parse({ name: "" })).toThrowError();
  });

  it("rejects name over 255 chars", () => {
    expect(() => createAccountSchema.parse({ name: "a".repeat(256) })).toThrowError();
  });
});

describe("updateAccountSchema", () => {
  it("accepts empty object", () => {
    expect(updateAccountSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial name update", () => {
    const result = updateAccountSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("rejects empty name when provided", () => {
    expect(() => updateAccountSchema.parse({ name: "" })).toThrowError();
  });
});

describe("updateAccountStatusSchema", () => {
  it("accepts valid status", () => {
    expect(updateAccountStatusSchema.parse({ status: "closed" }).status).toBe("closed");
  });

  it("rejects missing status", () => {
    expect(() => updateAccountStatusSchema.parse({})).toThrowError();
  });
});

describe("createAccountEmailSchema", () => {
  it("accepts valid email", () => {
    const result = createAccountEmailSchema.parse({ email: "test@example.com" });
    expect(result.email).toBe("test@example.com");
    expect(result.isPrimary).toBe(false);
  });

  it("accepts optional labelId and isPrimary", () => {
    const result = createAccountEmailSchema.parse({ email: "a@b.com", labelId: "lbl", isPrimary: true });
    expect(result.labelId).toBe("lbl");
    expect(result.isPrimary).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(() => createAccountEmailSchema.parse({ email: "bad" })).toThrowError();
  });
});

describe("updateAccountEmailSchema", () => {
  it("accepts empty object (all partial)", () => {
    expect(updateAccountEmailSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial email update", () => {
    const result = updateAccountEmailSchema.parse({ email: "new@test.com" });
    expect(result.email).toBe("new@test.com");
  });
});

describe("createAccountPhoneNumberSchema", () => {
  it("accepts valid phone number", () => {
    const result = createAccountPhoneNumberSchema.parse({ phoneNumber: "+1234567890" });
    expect(result.phoneNumber).toBe("+1234567890");
    expect(result.hasWhatsapp).toBe(false);
    expect(result.isPrimary).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createAccountPhoneNumberSchema.parse({
      phoneNumber: "+1234",
      labelId: "lbl",
      hasWhatsapp: true,
      isPrimary: true,
    });
    expect(result.hasWhatsapp).toBe(true);
    expect(result.isPrimary).toBe(true);
  });

  it("rejects empty phone number", () => {
    expect(() => createAccountPhoneNumberSchema.parse({ phoneNumber: "" })).toThrowError();
  });
});

describe("updateAccountPhoneNumberSchema", () => {
  it("accepts empty object", () => {
    expect(updateAccountPhoneNumberSchema.parse({})).toStrictEqual({});
  });
});

describe("linkAccountHumanSchema", () => {
  it("accepts valid humanId", () => {
    const result = linkAccountHumanSchema.parse({ humanId: "h-1" });
    expect(result.humanId).toBe("h-1");
  });

  it("accepts optional labelId", () => {
    const result = linkAccountHumanSchema.parse({ humanId: "h-1", labelId: "lbl" });
    expect(result.labelId).toBe("lbl");
  });

  it("rejects empty humanId", () => {
    expect(() => linkAccountHumanSchema.parse({ humanId: "" })).toThrowError();
  });

  it("rejects missing humanId", () => {
    expect(() => linkAccountHumanSchema.parse({})).toThrowError();
  });
});

describe("updateAccountHumanSchema", () => {
  it("accepts null labelId", () => {
    const result = updateAccountHumanSchema.parse({ labelId: null });
    expect(result.labelId).toBeNull();
  });

  it("accepts string labelId", () => {
    const result = updateAccountHumanSchema.parse({ labelId: "lbl" });
    expect(result.labelId).toBe("lbl");
  });

  it("accepts empty object", () => {
    expect(updateAccountHumanSchema.parse({})).toStrictEqual({});
  });
});

describe("createConfigItemSchema", () => {
  it("accepts valid name", () => {
    expect(createConfigItemSchema.parse({ name: "Type A" }).name).toBe("Type A");
  });

  it("rejects empty name", () => {
    expect(() => createConfigItemSchema.parse({ name: "" })).toThrowError();
  });

  it("rejects name over 255 chars", () => {
    expect(() => createConfigItemSchema.parse({ name: "a".repeat(256) })).toThrowError();
  });
});

describe("updateConfigItemSchema", () => {
  it("accepts valid name", () => {
    expect(updateConfigItemSchema.parse({ name: "Type B" }).name).toBe("Type B");
  });

  it("rejects empty name", () => {
    expect(() => updateConfigItemSchema.parse({ name: "" })).toThrowError();
  });
});
