import { describe, it, expect } from "vitest";
import { createPetSchema, updatePetSchema, petBreedSchema } from "./pets";

describe("petBreedSchema", () => {
  it("accepts valid breed", () => {
    expect(petBreedSchema.parse("Golden Retriever")).toBe("Golden Retriever");
  });

  it("accepts Mixed Breed", () => {
    expect(petBreedSchema.parse("Mixed Breed")).toBe("Mixed Breed");
  });

  it("accepts Other", () => {
    expect(petBreedSchema.parse("Other")).toBe("Other");
  });

  it("rejects invalid breed", () => {
    expect(() => petBreedSchema.parse("Unicorn")).toThrowError();
  });
});

describe("createPetSchema", () => {
  const validInput = { humanId: "h-1", name: "Rex" };

  it("accepts valid minimal input", () => {
    const result = createPetSchema.parse(validInput);
    expect(result.humanId).toBe("h-1");
    expect(result.name).toBe("Rex");
  });

  it("accepts optional breed and weight", () => {
    const result = createPetSchema.parse({ ...validInput, breed: "Poodle", weight: 5.5 });
    expect(result.breed).toBe("Poodle");
    expect(result.weight).toBe(5.5);
  });

  it("rejects empty humanId", () => {
    expect(() => createPetSchema.parse({ ...validInput, humanId: "" })).toThrowError();
  });

  it("rejects empty name", () => {
    expect(() => createPetSchema.parse({ ...validInput, name: "" })).toThrowError();
  });

  it("rejects name over 100 chars", () => {
    expect(() => createPetSchema.parse({ ...validInput, name: "a".repeat(101) })).toThrowError();
  });

  it("rejects non-positive weight", () => {
    expect(() => createPetSchema.parse({ ...validInput, weight: 0 })).toThrowError();
    expect(() => createPetSchema.parse({ ...validInput, weight: -1 })).toThrowError();
  });

  it("rejects invalid breed", () => {
    expect(() => createPetSchema.parse({ ...validInput, breed: "Dragon" })).toThrowError();
  });

  it("accepts cat with no breed (refine passes)", () => {
    const result = createPetSchema.parse({ ...validInput, type: "cat", breed: null });
    expect(result.type).toBe("cat");
    expect(result.breed).toBeNull();
  });

  it("rejects cat with a breed (refine fails)", () => {
    expect(() =>
      createPetSchema.parse({ ...validInput, type: "cat", breed: "Poodle" }),
    ).toThrowError();
  });

  it("accepts dog with a breed (refine passes — type is not cat)", () => {
    const result = createPetSchema.parse({ ...validInput, type: "dog", breed: "Poodle" });
    expect(result.type).toBe("dog");
    expect(result.breed).toBe("Poodle");
  });
});

describe("updatePetSchema", () => {
  it("accepts empty object (all optional)", () => {
    expect(updatePetSchema.parse({})).toStrictEqual({});
  });

  it("accepts partial name update", () => {
    const result = updatePetSchema.parse({ name: "Spot" });
    expect(result.name).toBe("Spot");
  });

  it("does not include humanId (omitted from update)", () => {
    const result = updatePetSchema.parse({ name: "Spot" });
    expect(result).not.toHaveProperty("humanId");
  });
});
