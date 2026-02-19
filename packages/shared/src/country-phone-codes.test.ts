import { describe, it, expect } from "vitest";
import { COUNTRY_PHONE_CODES } from "./country-phone-codes";

describe("COUNTRY_PHONE_CODES", () => {
  it("is non-empty", () => {
    expect(COUNTRY_PHONE_CODES.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    for (const entry of COUNTRY_PHONE_CODES) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
      expect(typeof entry.dialCode).toBe("string");
      expect(entry.dialCode.length).toBeGreaterThan(0);
      expect(typeof entry.flag).toBe("string");
      expect(entry.flag.length).toBeGreaterThan(0);
      expect(typeof entry.iso2).toBe("string");
      expect(entry.iso2).toHaveLength(2);
    }
  });

  it("dial codes start with +", () => {
    for (const entry of COUNTRY_PHONE_CODES) {
      expect(entry.dialCode.startsWith("+")).toBe(true);
    }
  });

  it("iso2 codes are uppercase", () => {
    for (const entry of COUNTRY_PHONE_CODES) {
      expect(entry.iso2).toBe(entry.iso2.toUpperCase());
    }
  });

  it("contains United States with +1", () => {
    const us = COUNTRY_PHONE_CODES.find((c) => c.iso2 === "US");
    expect(us).toBeDefined();
    expect(us?.dialCode).toBe("+1");
    expect(us?.name).toBe("United States");
  });

  it("contains United Kingdom with +44", () => {
    const uk = COUNTRY_PHONE_CODES.find((c) => c.iso2 === "GB");
    expect(uk).toBeDefined();
    expect(uk?.dialCode).toBe("+44");
  });

  it("has no duplicate iso2 codes", () => {
    const iso2s = COUNTRY_PHONE_CODES.map((c) => c.iso2);
    const unique = new Set(iso2s);
    expect(unique.size).toBe(iso2s.length);
  });
});
