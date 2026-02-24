import { describe, it, expect } from "vitest";
import { normalizePhone, phonesMatch } from "../../../src/lib/phone-utils";

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------

describe("normalizePhone", () => {
  it("strips all non-digit characters from a formatted US number", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("15551234567");
  });

  it("returns empty string when input contains no digits", () => {
    expect(normalizePhone("abc")).toBe("");
  });

  it("passes through a string that is already pure digits", () => {
    expect(normalizePhone("1234567890")).toBe("1234567890");
  });

  it("strips spaces, dashes, and parentheses", () => {
    expect(normalizePhone("(800) 555-1234")).toBe("8005551234");
  });

  it("strips plus sign from international prefix", () => {
    expect(normalizePhone("+44 20 7946 0958")).toBe("442079460958");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizePhone("   ")).toBe("");
  });

  it("strips dots used as separators", () => {
    expect(normalizePhone("1.555.123.4567")).toBe("15551234567");
  });
});

// ---------------------------------------------------------------------------
// phonesMatch
// ---------------------------------------------------------------------------

describe("phonesMatch", () => {
  it("returns true when last 9 digits are identical", () => {
    expect(phonesMatch("5551234567", "5551234567")).toBe(true);
  });

  it("returns true when different country codes share the same local number", () => {
    // +1 791 234 567  -> 1791234567 -> last 9: 791234567
    // +356 791 234 567 -> 356791234567 -> last 9: 791234567
    expect(phonesMatch("+1 791 234 567", "+356 791 234 567")).toBe(true);
  });

  it("returns false when last 9 digits differ", () => {
    expect(phonesMatch("+1 555 123 4567", "+1 555 999 9999")).toBe(false);
  });

  it("returns false when first argument has fewer than 9 digits after normalization", () => {
    expect(phonesMatch("12345678", "555123456789")).toBe(false);
  });

  it("returns false when second argument has fewer than 9 digits after normalization", () => {
    expect(phonesMatch("555123456789", "12345678")).toBe(false);
  });

  it("returns false when both arguments have fewer than 9 digits", () => {
    expect(phonesMatch("123", "123")).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(phonesMatch("", "")).toBe(false);
  });

  it("works with space-separated format", () => {
    expect(phonesMatch("555 123 4567", "5551234567")).toBe(true);
  });

  it("works with dash-separated format", () => {
    expect(phonesMatch("555-123-4567", "5551234567")).toBe(true);
  });

  it("works with parentheses format", () => {
    expect(phonesMatch("(555) 123-4567", "5551234567")).toBe(true);
  });

  it("returns false when only one side has a non-digit handle (email-style)", () => {
    // email normalized = "" which is < 9 digits
    expect(phonesMatch("user@example.com", "+1 555 123 4567")).toBe(false);
  });

  it("matches when last 9 digits are exactly equal across 9-digit inputs", () => {
    expect(phonesMatch("123456789", "123456789")).toBe(true);
  });

  it("does not match when inputs are exactly 9 digits but differ", () => {
    expect(phonesMatch("123456789", "987654321")).toBe(false);
  });
});
