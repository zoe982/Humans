import { describe, it, expect } from "vitest";
import { isListResponse, fetchEntityList } from "$lib/data/api-helpers";

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

  describe("fetchEntityList", () => {
    it("returns data array from valid API response", async () => {
      const items = [{ id: "1" }, { id: "2" }];
      const mockFetch = async () => new Response(JSON.stringify({ data: items }), { status: 200 });
      const result = await fetchEntityList(mockFetch, "/api/things", null);
      expect(result).toEqual(items);
    });

    it("returns empty array on non-OK response", async () => {
      const mockFetch = async () => new Response("Not Found", { status: 404 });
      const result = await fetchEntityList(mockFetch, "/api/things", null);
      expect(result).toEqual([]);
    });

    it("returns empty array on network error instead of throwing", async () => {
      const mockFetch = async () => {
        throw new TypeError("Failed to fetch");
      };
      const result = await fetchEntityList(mockFetch, "/api/things", null);
      expect(result).toEqual([]);
    });

    it("returns empty array on invalid JSON instead of throwing", async () => {
      const mockFetch = async () => new Response("not json {{", { status: 200, headers: { "Content-Type": "text/html" } });
      const result = await fetchEntityList(mockFetch, "/api/things", null);
      expect(result).toEqual([]);
    });
  });
});
