import { describe, it, expect } from "vitest";
import { COUNTRIES } from "./countries";

describe("COUNTRIES", () => {
  it("is non-empty", () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
  });

  it("contains United States", () => {
    expect(COUNTRIES).toContain("United States");
  });

  it("contains United Kingdom", () => {
    expect(COUNTRIES).toContain("United Kingdom");
  });

  it("contains Israel", () => {
    expect(COUNTRIES).toContain("Israel");
  });

  it("is sorted alphabetically", () => {
    const sorted = [...COUNTRIES].sort((a, b) => a.localeCompare(b));
    expect(COUNTRIES).toStrictEqual(sorted);
  });

  it("has no duplicates", () => {
    const unique = new Set(COUNTRIES);
    expect(unique.size).toBe(COUNTRIES.length);
  });

  it("starts with Afghanistan", () => {
    expect(COUNTRIES[0]).toBe("Afghanistan");
  });

  it("ends with Zimbabwe", () => {
    expect(COUNTRIES[COUNTRIES.length - 1]).toBe("Zimbabwe");
  });

  it("has at least 190 entries", () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(190);
  });
});
