import { describe, expect, test } from "vitest";
import { normalizeEmail, normalizePhone, normalizeUrl, normalizeSocialHandle } from "./normalize";

describe("normalizeEmail", () => {
  test("lowercases and trims", () => {
    expect(normalizeEmail("  John@EXAMPLE.COM  ")).toBe("john@example.com");
  });

  test("handles already normalized input", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });

  test("trims internal whitespace only at edges", () => {
    expect(normalizeEmail(" A@B.COM ")).toBe("a@b.com");
  });
});

describe("normalizePhone", () => {
  test("keeps leading + and digits only", () => {
    expect(normalizePhone("+1 (555) 123-4567")).toBe("+15551234567");
  });

  test("strips all non-digit characters except leading +", () => {
    expect(normalizePhone("  +44 20 7946 0958  ")).toBe("+442079460958");
  });

  test("handles number without leading +", () => {
    expect(normalizePhone("555-123-4567")).toBe("5551234567");
  });

  test("handles already normalized input", () => {
    expect(normalizePhone("+15551234567")).toBe("+15551234567");
  });
});

describe("normalizeUrl", () => {
  test("strips protocol, www, trailing slash, and lowercases", () => {
    expect(normalizeUrl("HTTPS://WWW.Example.COM/path/")).toBe("example.com/path");
  });

  test("strips http protocol", () => {
    expect(normalizeUrl("http://example.com")).toBe("example.com");
  });

  test("preserves path and query", () => {
    expect(normalizeUrl("https://example.com/path?q=1")).toBe("example.com/path?q=1");
  });

  test("handles input without protocol", () => {
    expect(normalizeUrl("www.example.com/")).toBe("example.com");
  });

  test("handles already normalized input", () => {
    expect(normalizeUrl("example.com/path")).toBe("example.com/path");
  });

  test("trims whitespace", () => {
    expect(normalizeUrl("  https://example.com  ")).toBe("example.com");
  });
});

describe("normalizeSocialHandle", () => {
  test("trims whitespace only", () => {
    expect(normalizeSocialHandle("  @johndoe  ")).toBe("@johndoe");
  });

  test("preserves case", () => {
    expect(normalizeSocialHandle("JohnDoe")).toBe("JohnDoe");
  });

  test("preserves special characters", () => {
    expect(normalizeSocialHandle(" user_name.123 ")).toBe("user_name.123");
  });
});
