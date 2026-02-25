import { describe, it, expect } from "vitest";
import { isListResponse } from "$lib/data/api-helpers";

describe("api-helpers", () => {
  describe("isListResponse", () => {
    it("returns true for valid list response", () => {
      expect(isListResponse({ data: [{ id: "1" }] })).toBe(true);
    });

    it("returns true for list response with meta", () => {
      expect(
        isListResponse({ data: [], meta: { page: 1, limit: 25, total: 0 } }),
      ).toBe(true);
    });

    it("returns false for null", () => {
      expect(isListResponse(null)).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(isListResponse("string")).toBe(false);
    });

    it("returns false when data is not an array", () => {
      expect(isListResponse({ data: "not-array" })).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isListResponse({})).toBe(false);
    });
  });
});
