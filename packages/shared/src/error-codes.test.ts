import { describe, it, expect } from "vitest";
import { ERROR_CODES } from "./error-codes";

describe("ERROR_CODES", () => {
  it("has at least one error code", () => {
    expect(Object.keys(ERROR_CODES).length).toBeGreaterThan(0);
  });

  it("all values are strings", () => {
    for (const [, value] of Object.entries(ERROR_CODES)) {
      expect(typeof value).toBe("string");
    }
  });

  it("all keys match their values", () => {
    for (const [key, value] of Object.entries(ERROR_CODES)) {
      expect(key).toBe(value);
    }
  });

  it("has no duplicate values", () => {
    const values = Object.values(ERROR_CODES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("contains auth error codes", () => {
    expect(ERROR_CODES.AUTH_REQUIRED).toBe("AUTH_REQUIRED");
    expect(ERROR_CODES.AUTH_INVALID_SESSION).toBe("AUTH_INVALID_SESSION");
    expect(ERROR_CODES.AUTH_INSUFFICIENT_PERMS).toBe("AUTH_INSUFFICIENT_PERMS");
  });

  it("contains not found codes", () => {
    expect(ERROR_CODES.HUMAN_NOT_FOUND).toBe("HUMAN_NOT_FOUND");
    expect(ERROR_CODES.ACCOUNT_NOT_FOUND).toBe("ACCOUNT_NOT_FOUND");
    expect(ERROR_CODES.FLIGHT_NOT_FOUND).toBe("FLIGHT_NOT_FOUND");
  });

  it("contains validation code", () => {
    expect(ERROR_CODES.VALIDATION_FAILED).toBe("VALIDATION_FAILED");
  });

  it("contains internal error code", () => {
    expect(ERROR_CODES.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
  });
});
