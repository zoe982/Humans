import { describe, it, expect } from "vitest";
import { createAgreementSchema, updateAgreementSchema, agreementStatusEnum } from "./agreements";

describe("agreementStatusEnum", () => {
  it("accepts open", () => {
    const result = agreementStatusEnum.parse("open");
    expect(result).toBe("open");
  });

  it("accepts active", () => {
    const result = agreementStatusEnum.parse("active");
    expect(result).toBe("active");
  });

  it("accepts closed_inactive", () => {
    const result = agreementStatusEnum.parse("closed_inactive");
    expect(result).toBe("closed_inactive");
  });

  it("rejects an invalid value", () => {
    expect(() => agreementStatusEnum.parse("pending")).toThrowError();
  });
});

describe("createAgreementSchema", () => {
  const validWithHuman = { title: "Service Agreement", humanId: "h-1" };
  const validWithAccount = { title: "Service Agreement", accountId: "acc-1" };

  it("accepts valid input with humanId only", () => {
    const result = createAgreementSchema.parse(validWithHuman);
    expect(result.title).toBe("Service Agreement");
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBeUndefined();
  });

  it("accepts valid input with accountId only", () => {
    const result = createAgreementSchema.parse(validWithAccount);
    expect(result.title).toBe("Service Agreement");
    expect(result.accountId).toBe("acc-1");
    expect(result.humanId).toBeUndefined();
  });

  it("accepts valid input with both humanId and accountId", () => {
    const result = createAgreementSchema.parse({ title: "Service Agreement", humanId: "h-1", accountId: "acc-1" });
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBe("acc-1");
  });

  it("rejects when neither humanId nor accountId is provided", () => {
    expect(() => createAgreementSchema.parse({ title: "Service Agreement" })).toThrowError();
  });

  it("rejects empty title", () => {
    expect(() => createAgreementSchema.parse({ ...validWithHuman, title: "" })).toThrowError();
  });

  it("rejects title over 500 characters", () => {
    expect(() => createAgreementSchema.parse({ ...validWithHuman, title: "a".repeat(501) })).toThrowError();
  });

  it("defaults status to open", () => {
    const result = createAgreementSchema.parse(validWithHuman);
    expect(result.status).toBe("open");
  });

  it("accepts status active", () => {
    const result = createAgreementSchema.parse({ ...validWithHuman, status: "active" });
    expect(result.status).toBe("active");
  });

  it("accepts status closed_inactive", () => {
    const result = createAgreementSchema.parse({ ...validWithHuman, status: "closed_inactive" });
    expect(result.status).toBe("closed_inactive");
  });

  it("rejects invalid status value", () => {
    expect(() => createAgreementSchema.parse({ ...validWithHuman, status: "draft" })).toThrowError();
  });

  it("accepts optional typeId", () => {
    const result = createAgreementSchema.parse({ ...validWithHuman, typeId: "type-1" });
    expect(result.typeId).toBe("type-1");
  });

  it("accepts optional activationDate in YYYY-MM-DD format", () => {
    const result = createAgreementSchema.parse({ ...validWithHuman, activationDate: "2025-06-01" });
    expect(result.activationDate).toBe("2025-06-01");
  });

  it("rejects invalid activationDate format", () => {
    expect(() => createAgreementSchema.parse({ ...validWithHuman, activationDate: "01/06/2025" })).toThrowError();
  });

  it("accepts optional notes", () => {
    const result = createAgreementSchema.parse({ ...validWithHuman, notes: "Some notes here" });
    expect(result.notes).toBe("Some notes here");
  });
});

describe("updateAgreementSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateAgreementSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial title update", () => {
    const result = updateAgreementSchema.parse({ title: "Updated Agreement" });
    expect(result.title).toBe("Updated Agreement");
  });

  it("accepts typeId: null to clear type", () => {
    const result = updateAgreementSchema.parse({ typeId: null });
    expect(result.typeId).toBeNull();
  });

  it("accepts activationDate: null to clear date", () => {
    const result = updateAgreementSchema.parse({ activationDate: null });
    expect(result.activationDate).toBeNull();
  });

  it("accepts notes: null to clear notes", () => {
    const result = updateAgreementSchema.parse({ notes: null });
    expect(result.notes).toBeNull();
  });

  it("validates activationDate format when provided", () => {
    expect(() => updateAgreementSchema.parse({ activationDate: "06/01/2025" })).toThrowError();
  });

  it("accepts valid activationDate when provided", () => {
    const result = updateAgreementSchema.parse({ activationDate: "2025-12-31" });
    expect(result.activationDate).toBe("2025-12-31");
  });

  it("accepts status update", () => {
    const result = updateAgreementSchema.parse({ status: "closed_inactive" });
    expect(result.status).toBe("closed_inactive");
  });
});
