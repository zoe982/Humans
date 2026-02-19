import { describe, it, expect } from "vitest";
import {
  createGeoInterestSchema,
  createGeoInterestExpressionSchema,
  updateGeoInterestExpressionSchema,
} from "./geo-interests";

describe("createGeoInterestSchema", () => {
  it("accepts valid input", () => {
    const result = createGeoInterestSchema.parse({ city: "London", country: "United Kingdom" });
    expect(result.city).toBe("London");
    expect(result.country).toBe("United Kingdom");
  });

  it("rejects empty city", () => {
    expect(() => createGeoInterestSchema.parse({ city: "", country: "UK" })).toThrowError();
  });

  it("rejects empty country", () => {
    expect(() => createGeoInterestSchema.parse({ city: "London", country: "" })).toThrowError();
  });

  it("rejects city over 200 chars", () => {
    expect(() => createGeoInterestSchema.parse({ city: "a".repeat(201), country: "UK" })).toThrowError();
  });

  it("rejects country over 200 chars", () => {
    expect(() => createGeoInterestSchema.parse({ city: "London", country: "a".repeat(201) })).toThrowError();
  });
});

describe("createGeoInterestExpressionSchema", () => {
  it("accepts with geoInterestId", () => {
    const result = createGeoInterestExpressionSchema.parse({
      humanId: "h-1",
      geoInterestId: "gi-1",
    });
    expect(result.humanId).toBe("h-1");
    expect(result.geoInterestId).toBe("gi-1");
  });

  it("accepts with city and country (no geoInterestId)", () => {
    const result = createGeoInterestExpressionSchema.parse({
      humanId: "h-1",
      city: "Paris",
      country: "France",
    });
    expect(result.city).toBe("Paris");
    expect(result.country).toBe("France");
  });

  it("rejects without geoInterestId and without city+country", () => {
    expect(() => createGeoInterestExpressionSchema.parse({ humanId: "h-1" })).toThrowError();
  });

  it("rejects with city but no country", () => {
    expect(() => createGeoInterestExpressionSchema.parse({ humanId: "h-1", city: "Paris" })).toThrowError();
  });

  it("accepts optional activityId and notes", () => {
    const result = createGeoInterestExpressionSchema.parse({
      humanId: "h-1",
      geoInterestId: "gi-1",
      activityId: "act-1",
      notes: "Interested in relocating",
    });
    expect(result.activityId).toBe("act-1");
    expect(result.notes).toBe("Interested in relocating");
  });

  it("rejects empty humanId", () => {
    expect(() => createGeoInterestExpressionSchema.parse({ humanId: "", geoInterestId: "gi-1" })).toThrowError();
  });

  it("rejects notes over 2000 chars", () => {
    expect(() =>
      createGeoInterestExpressionSchema.parse({
        humanId: "h-1",
        geoInterestId: "gi-1",
        notes: "a".repeat(2001),
      }),
    ).toThrowError();
  });
});

describe("updateGeoInterestExpressionSchema", () => {
  it("accepts null notes", () => {
    const result = updateGeoInterestExpressionSchema.parse({ notes: null });
    expect(result.notes).toBeNull();
  });

  it("accepts string notes", () => {
    const result = updateGeoInterestExpressionSchema.parse({ notes: "Updated notes" });
    expect(result.notes).toBe("Updated notes");
  });

  it("rejects notes over 2000 chars", () => {
    expect(() => updateGeoInterestExpressionSchema.parse({ notes: "a".repeat(2001) })).toThrowError();
  });

  it("rejects missing notes field", () => {
    expect(() => updateGeoInterestExpressionSchema.parse({})).toThrowError();
  });
});
