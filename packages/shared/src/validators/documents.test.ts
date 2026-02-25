import { describe, it, expect } from "vitest";
import { createDocumentSchema } from "./documents";

describe("createDocumentSchema", () => {
  const validInput = { entityType: "human", entityId: "h-1" };

  it("accepts valid input", () => {
    const result = createDocumentSchema.parse(validInput);
    expect(result.entityType).toBe("human");
    expect(result.entityId).toBe("h-1");
  });

  it("rejects empty entityType", () => {
    expect(() => createDocumentSchema.parse({ ...validInput, entityType: "" })).toThrowError();
  });

  it("rejects empty entityId", () => {
    expect(() => createDocumentSchema.parse({ ...validInput, entityId: "" })).toThrowError();
  });

  it("rejects missing entityType", () => {
    expect(() => createDocumentSchema.parse({ entityId: "h-1" })).toThrowError();
  });

  it("rejects missing entityId", () => {
    expect(() => createDocumentSchema.parse({ entityType: "human" })).toThrowError();
  });
});
